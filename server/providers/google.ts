import { LIMITS } from '../../shared/limits.js';
import type { ChatMessage, ContentPart } from '../../shared/schemas/chat.js';
import { parseSseStream } from '../../shared/sse.js';
import type { ServerConfig } from '../config.js';
import {
  AppError,
  abortError,
  isAbortError,
  providerStatusError,
} from '../errors.js';

type UpstreamPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface UpstreamMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | UpstreamPart[];
}

interface UpstreamRequest {
  model: string;
  messages: UpstreamMessage[];
  stream: boolean;
  response_format?: { type: 'json_object' };
  [key: string]: unknown;
}

export interface ChatCompletionOptions {
  config: ServerConfig;
  messages: ChatMessage[];
  systemPrompt: string;
  signal?: AbortSignal;
  hasImages: boolean;
  timeoutMs?: number;
}

export interface JsonCompletionOptions {
  config: ServerConfig;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxTokens?: number;
}

function toParts(content: ContentPart[]): UpstreamPart[] {
  return content.map((part) =>
    part.type === 'text'
      ? { type: 'text', text: part.text }
      : { type: 'image_url', image_url: { url: part.image_url.url } },
  );
}

export function buildUpstreamMessages(
  systemPrompt: string,
  messages: ChatMessage[],
): UpstreamMessage[] {
  const upstream: UpstreamMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const message of messages) {
    if (typeof message.content === 'string') {
      upstream.push({ role: message.role, content: message.content });
      continue;
    }

    if (message.role === 'assistant') {
      const text = message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\\n')
        .trim();
      if (text) upstream.push({ role: 'assistant', content: text });
      continue;
    }

    upstream.push({ role: 'user', content: toParts(message.content) });
  }

  return upstream;
}

export function hasImagesInMessages(messages: ChatMessage[]): boolean {
  return messages.some(
    (message) =>
      Array.isArray(message.content) &&
      message.content.some((part) => part.type === 'image_url'),
  );
}

function endpointFor(baseUrl: string): string {
  return baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl}/chat/completions`;
}

function requestHeaders(config: ServerConfig): Record<string, string> {
  // Prefer Google API key, fallback to OpenRouter if Google not set and we are in fallback mode
  // This will be overridden in the actual fetch logic; we keep header generic.
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.googleApiKey ?? ''}`,
  };
}

function requireConfiguredGoogle(config: ServerConfig): { apiKey: string; model: string } {
  if (!config.googleApiKey || !config.googleModel) {
    throw new AppError(
      500,
      'not_configured',
      'Falta configurar el proveedor de IA de Google.',
    );
  }
  return { apiKey: config.googleApiKey, model: config.googleModel };
}

function requireConfiguredOpenRouter(config: ServerConfig): { apiKey: string; model: string } {
  if (!config.openRouterApiKey || !config.openRouterModel) {
    throw new AppError(
      500,
      'not_configured',
      'Falta configurar el proveedor de OpenRouter.',
    );
  }
  return { apiKey: config.openRouterApiKey, model: config.openRouterModel };
}

function createTimeout(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();

  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

function timeoutError(): AppError {
  return new AppError(
    504,
    'provider_timeout',
    'El proveedor tardó demasiado en responder. Probá de nuevo.',
  );
}

function streamFailure(error: unknown, timedOut: boolean, signal?: AbortSignal) {
  if (timedOut) return timeoutError();
  if (signal?.aborted || isAbortError(error)) throw abortError();
  if (error instanceof AppError) return error;
  return new AppError(
    502,
    'provider_stream_failed',
    'Se cortó la respuesta del proveedor. Probá de nuevo.',
  );
}

function extractDelta(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') {
    return '';
  }
  const choice = choices[0] as {
    delta?: { content?: unknown };
    text?: unknown;
  };
  const content = choice.delta?.content ?? choice.text;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === 'object' && 'text' in part
          ? String((part as { text?: unknown }).text ?? '')
          : '',
      )
      .join('');
  }
  return '';
}

function extractMessageText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') {
    return '';
  }
  const content = (choices[0] as { message?: { content?: unknown } }).message
    ?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        part && typeof part === 'object' && 'text' in part
          ? String((part as { text?: unknown }).text ?? '')
          : '',
      })
      .join('');
  }
  return '';
}

/**
 * Google Gemini provider (OpenAI‑compatible endpoint) with streaming.
 * On 429, transparently falls back to OpenRouter :free.
 */
export async function* GoogleChatStream(
  options: ChatCompletionOptions,
): AsyncGenerator<string> {
  // Try Google first
  try {
    const { model } = requireConfiguredGoogle(options.config);
    const timeoutMs = options.timeoutMs ?? LIMITS.chatTimeoutMs;
    const guard = createTimeout(options.signal, timeoutMs);
    const body: UpstreamRequest = {
      model,
      messages: buildUpstreamMessages(options.systemPrompt, options.messages),
      stream: true,
    };
    // Gemini uses max_output_tokens in the query param (?alt=json) but via the OpenAI‑compatible
    // endpoint it expects the field in the JSON body as "max_tokens". The OpenAI‑compatible wrapper
    // expects the token limit in body.max_tokens; we'll follow the same pattern as openai.ts.
    body.max_tokens = options.config.googleMaxTokens ?? LIMITS.maxOutputTokens;

    let response: Response;
    try {
      response = await fetch(
        endpointFor('https://generativelanguage.googleapis.com/v1beta/openai'),
        {
          method: 'POST',
          headers: requestHeaders(options.config),
          body: JSON.stringify(body),
          signal: guard.signal,
        }
      );
    } catch (error) {
      guard.cleanup();
      if (guard.didTimeout()) throw timeoutError();
      if (options.signal?.aborted || isAbortError(error)) throw abortError();
      throw new AppError(
        502,
        'provider_unreachable',
        'No se pudo contactar al proveedor de IA. Revisá la configuración.',
      );
    }

    if (!response.ok) {
      // If we get a 429, try OpenRouter as fallback
      if (response.status === 429) {
        guard.cleanup();
        // Fall through to OpenRouter logic below
      } else {
        await response.body?.cancel().catch(() => undefined);
        const error = providerStatusError(response.status, options.hasImages);
        guard.cleanup();
        throw error;
      }
    }

    if (!response.body) {
      guard.cleanup();
      throw new AppError(
        502,
        'provider_empty',
        'El proveedor devolvió una respuesta vacía.',
      );
    }

    // Stream response
    return (async function* streamResponse() {
      let produced = false;
      try {
        for await (const event of parseSseStream(response.body!)) {
          if (event.data.trim() === '[DONE]') return;
          let payload: unknown;
          try {
            payload = JSON.parse(event.data);
          } catch {
            continue;
          }
          const text = extractDelta(payload);
          if (text) {
            produced = true;
            yield text;
          }
        }
        if (!produced) {
          throw new AppError(
            502,
            'provider_empty',
            'El proveedor no devolvió contenido.',
          );
        }
      } catch (error) {
        throw streamFailure(error, guard.didTimeout(), options.signal);
      } finally {
        guard.cleanup();
      }
    })();
  } catch (googleError) {
    // If Google failed due to 429 (caught above) or any other error, try OpenRouter
    // Only fallback on 429; for other errors we propagate Google's error.
    if (!(googleError instanceof AppError) || googleError.code !== 'provider_status') {
      throw googleError;
    }
    // Attempt OpenRouter fallback
    try {
      const { model } = requireConfiguredOpenRouter(options.config);
      const timeoutMs = options.timeoutMs ?? LIMITS.chatTimeoutMs;
      const guard = createTimeout(options.signal, timeoutMs);
      const body: UpstreamRequest = {
        model,
        messages: buildUpstreamMessages(options.systemPrompt, options.messages),
        stream: true,
      };
      body.max_tokens = options.config.openRouterMaxTokens ?? LIMITS.maxOutputTokens;

      let response: Response;
      try {
        response = await fetch(
          endpointFor('https://openrouter.ai/api/v1'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.openRouterApiKey ?? ''}`,
            },
            body: JSON.stringify(body),
            signal: guard.signal,
          }
        );
      } catch (error) {
        guard.cleanup();
        if (guard.didTimeout()) throw timeoutError();
        if (options.signal?.aborted || isAbortError(error)) throw abortError();
        throw new AppError(
          502,
          'provider_unreachable',
          'No se pudo contactar al proveedor de IA. Revisá la configuración.',
        );
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw providerStatusError(response.status, options.hasImages);
      }

      if (!response.body) {
        guard.cleanup();
        throw new AppError(
          502,
          'provider_empty',
          'El proveedor devolvió una respuesta vacía.',
        );
      }

      return (async function* streamResponse() {
        let produced = false;
        try {
          for await (const event of parseSseStream(response.body!)) {
            if (event.data.trim() === '[DONE]') return;
            let payload: unknown;
            try {
              payload = JSON.parse(event.data);
            } catch {
              continue;
            }
            const text = extractDelta(payload);
            if (text) {
              produced = true;
              yield text;
            }
          }
          if (!produced) {
            throw new AppError(
              502,
              'provider_empty',
              'El proveedor no devolvió contenido.',
            );
          }
        } catch (error) {
          throw streamFailure(error, guard.didTimeout(), options.signal);
        } finally {
          guard.cleanup();
        }
      })();
    } catch (openRouterError) {
      // If OpenRouter also fails, propagate its error
      throw openRouterError;
    }
  }
}

/**
 * JSON‑mode completion for structured output (e.g. oral‑exam questions).
 * Uses Google first, then OpenRouter on 429.
 */
export async function completeJsonGoogle(
  options: JsonCompletionOptions,
): Promise<string> {
  // Try Google first
  try {
    const { model } = requireConfiguredGoogle(options.config);
    const timeoutMs = options.timeoutMs ?? LIMITS.jsonAttemptTimeoutMs;
    const guard = createTimeout(options.signal, timeoutMs);
    const body: UpstreamRequest = {
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        ...options.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      stream: false,
    };
    body.max_tokens =
      options.maxTokens ?? LIMITS.maxOutputTokens * 2;
    if (options.config.googleJsonMode) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(
        endpointFor('https://generativelanguage.googleapis.com/v1beta/openai'),
        {
          method: 'POST',
          headers: requestHeaders(options.config),
          body: JSON.stringify(body),
          signal: guard.signal,
        }
      );

      if (!response.ok) {
        // 429 → try OpenRouter
        if (response.status === 429) {
          // fall through to OpenRouter logic
        } else {
          await response.body?.cancel().catch(() => {});
          throw providerStatusError(response.status, false);
        }
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new AppError(
          502,
          'provider_invalid_json',
          'El proveedor devolvió una respuesta ilegible.',
        );
      }

      const text = extractMessageText(payload);
      if (!text.trim()) {
        throw new AppError(
          502,
          'provider_empty',
          'El proveedor no devolvió contenido.',
        );
      }
      return text;
    } catch (httpError) {
      // If we got here due to a 429, try OpenRouter
      if (httpError instanceof AppError && httpError.code === 'provider_status') {
        // fall through to OpenRouter
      } else {
        throw httpError;
      }
    }
  } catch (googleError) {
    // Propagate non‑429 errors; on 429 we will try OpenRouter
    if (!(googleError instanceof AppError) || googleError.code !== 'provider_status') {
      throw googleError;
    }
    // Attempt OpenRouter fallback
    try {
      const { model } = requireConfiguredOpenRouter(options.config);
      const timeoutMs = options.timeoutMs ?? LIMITS.jsonAttemptTimeoutMs;
      const guard = createTimeout(options.signal, timeoutMs);
      const body: UpstreamRequest = {
        model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          ...options.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        stream: false,
      };
      body.max_tokens =
        options.maxTokens ?? LIMITS.maxOutputTokens * 2;
      if (options.config.openRouterJsonMode) {
        body.response_format = { type: 'json_object' };
      }

      try {
        const response = await fetch(
          endpointFor('https://openrouter.ai/api/v1'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.openRouterApiKey ?? ''}`,
            },
            body: JSON.stringify(body),
            signal: guard.signal,
          }
        );

        if (!response.ok) {
          await response.body?.cancel().catch(() => {});
          throw providerStatusError(response.status, false);
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new AppError(
            502,
            'provider_invalid_json',
            'El proveedor devolvió una respuesta ilegible.',
          );
        }

        const text = extractMessageText(payload);
        if (!text.trim()) {
          throw new AppError(
            502,
            'provider_empty',
            'El proveedor no devolvió contenido.',
          );
        }
        return text;
      } catch (openRouterError) {
        throw openRouterError;
      } finally {
        guard.cleanup();
      }
    } finally {
      // guard cleaned in inner block
    }
  }
}