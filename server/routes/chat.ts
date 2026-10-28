import { chatRequestSchema } from '../../shared/schemas/chat.js';
import { DEFAULT_PERSONALITY, DEFAULT_TUTOR } from '../../shared/types.js';
import type { ServerConfig } from '../config.js';
import { readServerConfig } from '../config.js';
import { AppError, describeError, logError } from '../errors.js';
import { buildAssistantSystemPrompt } from '../prompts/assistant.js';
import { buildTutorSystemPrompt } from '../prompts/tutor.js';
import { buildDemoAnswer, streamDemoChat } from '../providers/demo.js';
import {
  hasImagesInMessages,
  openChatStream,
} from '../providers/openai.js';
import { checkOrigin, defaultLimiter, type RateLimiter } from '../security.js';
import type { RequestContext, RouteFailure } from './types.js';

export interface ChatSuccess {
  ok: true;
  demo: boolean;
  stream: AsyncGenerator<string>;
}

export type ChatResult = ChatSuccess | RouteFailure;

export interface ChatDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
}

function containsDocument(text: string): boolean {
  return (
    text.includes('<documento>') ||
    text.includes('---INICIO DOCUMENTO---') ||
    text.includes('[Documento adjunto:')
  );
}

function hasDocument(messages: Array<{ content: unknown }>): boolean {
  return messages.some((message) => {
    if (typeof message.content === 'string') return containsDocument(message.content);
    if (!Array.isArray(message.content)) return false;
    return message.content.some(
      (part) =>
        part &&
        typeof part === 'object' &&
        'text' in part &&
        typeof (part as { text?: unknown }).text === 'string' &&
        containsDocument((part as { text: string }).text),
    );
  });
}

export async function prepareChat(
  body: unknown,
  context: RequestContext,
  deps: ChatDeps = {},
): Promise<ChatResult> {
  const config = deps.config ?? readServerConfig();
  const limiter = deps.limiter ?? defaultLimiter;

  if (!checkOrigin(context.origin, context.host)) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden_origin',
      message: 'El origen de la solicitud no está permitido.',
    };
  }

  const rate = limiter.check(
    `chat:${context.ip || 'unknown'}`,
    config.rateLimitPerMinute,
  );
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: `Demasiadas solicitudes. Esperá ${rate.retryAfterSeconds} segundos y probá de nuevo.`,
    };
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      message:
        'La solicitud no es válida. Revisá el texto, los adjuntos y el modo elegido.',
    };
  }

  const request = parsed.data;
  const images = hasImagesInMessages(request.messages);
  if (images && !config.visionEnabled) {
    return {
      ok: false,
      status: 422,
      code: 'vision_disabled',
      message:
        config.provider === 'pollinations'
          ? 'La IA gratuita de la nube no procesa imágenes. Usá Ollama local con visión o configurá un proveedor con visión.'
          : 'El envío de imágenes está deshabilitado en este servidor.',
    };
  }

  if (config.demo) {
    const answer = buildDemoAnswer({
      mode: request.mode,
      tutor: request.tutor ?? DEFAULT_TUTOR,
      personality: request.personality ?? DEFAULT_PERSONALITY,
      messages: request.messages,
      hasImages: images,
      hasDocument: hasDocument(request.messages),
    });
    return {
      ok: true,
      demo: true,
      stream: streamDemoChat(answer, {
        signal: context.signal,
        delayMs: config.demoDelayMs,
      }),
    };
  }

  const personality = request.personality ?? DEFAULT_PERSONALITY;
  const systemPrompt =
    request.mode === 'tutor'
      ? buildTutorSystemPrompt(request.tutor ?? DEFAULT_TUTOR, personality)
      : buildAssistantSystemPrompt(personality);

  try {
    const stream = await openChatStream({
      config,
      messages: request.messages,
      systemPrompt,
      signal: context.signal,
      hasImages: images,
      timeoutMs: config.chatTimeoutMs,
    });
    return { ok: true, demo: false, stream };
  } catch (error) {
    if (!(error instanceof AppError)) logError(error);
    const failure = describeError(error);
    return {
      ok: false,
      status: failure.status,
      code: failure.code,
      message: failure.message,
    };
  }
}
