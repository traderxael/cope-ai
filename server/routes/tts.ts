import { ttsRequestSchema } from '../../shared/schemas/voice.js';
import type { ServerConfig } from '../config.js';
import { readServerConfig } from '../config.js';
import { AppError, describeError, logError } from '../errors.js';
import {
  checkOrigin,
  checkOwnerCode,
  defaultLimiter,
  type RateLimiter,
} from '../security.js';
import type { RequestContext, RouteFailure } from './types.js';

export interface TtsSuccess {
  ok: true;
  audio: Buffer;
  contentType: string;
}

export type TtsResult = TtsSuccess | RouteFailure;

export interface TtsDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
  fetchImpl?: typeof fetch;
}

function failure(status: number, code: string, message: string): RouteFailure {
  return { ok: false, status, code, message };
}

export async function prepareTts(
  body: unknown,
  context: RequestContext,
  deps: TtsDeps = {},
): Promise<TtsResult> {
  const config = deps.config ?? readServerConfig();
  const limiter = deps.limiter ?? defaultLimiter;
  const fetchImpl = deps.fetchImpl ?? fetch;

  if (!checkOrigin(context.origin, context.host)) {
    return failure(403, 'forbidden_origin', 'El origen no está permitido.');
  }
  if (!config.elevenLabsApiKey || !config.elevenLabsVoiceId) {
    return failure(
      501,
      'tts_not_configured',
      'La voz externa no está configurada en este servidor.',
    );
  }
  if (!checkOwnerCode(config.voiceCloneCode, context.ownerCode)) {
    return failure(
      403,
      'owner_required',
      'La voz externa requiere el código de propietario.',
    );
  }

  const rate = limiter.check(
    `tts:${context.ip || 'unknown'}`,
    config.ttsRateLimitPerMinute,
  );
  if (!rate.allowed) {
    return failure(
      429,
      'rate_limited',
      `Demasiadas reproducciones. Esperá ${rate.retryAfterSeconds} segundos.`,
    );
  }

  const parsed = ttsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failure(400, 'invalid_request', 'La solicitud de voz no es válida.');
  }

  const voiceId = parsed.data.voiceId ?? config.elevenLabsVoiceId;
  try {
    const response = await fetchImpl(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': config.elevenLabsApiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: parsed.data.text,
          model_id: config.elevenLabsModelId,
        }),
        signal: context.signal,
      },
    );
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return failure(
        502,
        'tts_failed',
        'El servicio de voz no pudo generar el audio. Se usará la voz del navegador.',
      );
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length) {
      return failure(
        502,
        'tts_empty',
        'El servicio de voz devolvió un audio vacío.',
      );
    }
    return {
      ok: true,
      audio,
      contentType: response.headers.get('content-type') ?? 'audio/mpeg',
    };
  } catch (error) {
    if (!(error instanceof AppError)) logError(error);
    const info = describeError(error);
    return failure(info.status, info.code, info.message);
  }
}
