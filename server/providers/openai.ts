import { LIMITS } from '../../shared/limits';
import type { ChatMessage, ContentPart } from '../../shared/schemas/chat';
import { parseSseStream } from '../../shared/sse';
import type { ServerConfig } from '../config';
import {
  AppError,
  abortError,
  isAbortError,
  providerStatusError,
} from '../errors';

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
        .join('\n')
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
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey ?? ''}`,
  };
}

function requireConfigured(config: ServerConfig): {
  apiKey: string;
  model: string;
} {
  if (!config.apiKey || !config.model) {
    throw new AppError(
      500,
      'not_configured',
      'Falta configurar el proveedor de IA.',
    );
  }
  return { apiKey: config.apiKey, model: config.model };
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
  if (signal?.aborted || isAbortError(error)) return abortError();
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
      .map((part) =>
        part && typeof part === 'object' && 'text' in part
          ? String((part as { text?: unknown }).text ?? '')
          : '',
      )
      .join('');
  }
  return '';
}

export async function openChatStream(
  options: ChatCompletionOptions,
): Promise<AsyncGenerator<string>> {
  const { model } = requireConfigured(options.config);
  const timeoutMs = options.timeoutMs ?? LIMITS.upstreamTimeoutMs;
  const guard = createTimeout(options.signal, timeoutMs);
  const body: UpstreamRequest = {
    model,
    messages: buildUpstreamMessages(options.systemPrompt, options.messages),
    stream: true,
  };
  body[options.config.tokenParam] = LIMITS.maxOutputTokens;

  let response: Response;
  try {
    response = await fetch(endpointFor(options.config.baseUrl), {
      method: 'POST',
      headers: requestHeaders(options.config),
      body: JSON.stringify(body),
      signal: guard.signal,
    });
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
    const error = providerStatusError(response.status, options.hasImages);
    guard.cleanup();
    throw error;
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
}

export async function completeJson(
  options: JsonCompletionOptions,
): Promise<string> {
  const { model } = requireConfigured(options.config);
  const timeoutMs = options.timeoutMs ?? LIMITS.upstreamTimeoutMs;
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
  body[options.config.tokenParam] =
    options.maxTokens ?? LIMITS.maxOutputTokens * 2;
  if (options.config.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  try {
    const response = await fetch(endpointFor(options.config.baseUrl), {
      method: 'POST',
      headers: requestHeaders(options.config),
      body: JSON.stringify(body),
      signal: guard.signal,
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
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
  } catch (error) {
    if (guard.didTimeout()) throw timeoutError();
    if (options.signal?.aborted || isAbortError(error)) throw abortError();
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      'provider_unreachable',
      'No se pudo contactar al proveedor de IA. Revisá la configuración.',
    );
  } finally {
    guard.cleanup();
  }
}
