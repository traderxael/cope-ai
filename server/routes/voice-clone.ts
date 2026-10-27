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

const VOICE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export interface VoiceCloneSuccess {
  ok: true;
  voiceId: string;
}

export type VoiceCloneResult = VoiceCloneSuccess | RouteFailure;

export interface VoiceCloneDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
  fetchImpl?: typeof fetch;
}

function failure(status: number, code: string, message: string): RouteFailure {
  return { ok: false, status, code, message };
}

function looksLikeMp3(audio: Buffer): boolean {
  if (audio.length < 4) return false;
  if (audio[0] === 0x49 && audio[1] === 0x44 && audio[2] === 0x33) {
    return true;
  }
  return audio[0] === 0xff && (audio[1]! & 0xe0) === 0xe0;
}

function cloneGuard(
  config: ServerConfig,
  context: RequestContext,
  limiter: RateLimiter,
): RouteFailure | null {
  if (!checkOrigin(context.origin, context.host)) {
    return failure(403, 'forbidden_origin', 'El origen no está permitido.');
  }
  if (!config.elevenLabsApiKey) {
    return failure(
      501,
      'voice_clone_not_configured',
      'La clonación de voz no está configurada.',
    );
  }
  if (!config.voiceCloneEnabled) {
    return failure(
      403,
      'voice_clone_disabled',
      'La clonación de voz está deshabilitada.',
    );
  }
  if (!checkOwnerCode(config.voiceCloneCode, context.ownerCode)) {
    return failure(
      403,
      'owner_required',
      'La clonación de voz requiere el código de propietario.',
    );
  }
  const rate = limiter.check(
    `voice-clone:${context.ip || 'unknown'}`,
    config.voiceCloneRateLimitPerMinute,
  );
  if (!rate.allowed) {
    return failure(
      429,
      'rate_limited',
      `Demasiados intentos. Esperá ${rate.retryAfterSeconds} segundos.`,
    );
  }
  return null;
}

export async function prepareVoiceClone(
  audio: Buffer,
  context: RequestContext,
  deps: VoiceCloneDeps = {},
): Promise<VoiceCloneResult> {
  const config = deps.config ?? readServerConfig();
  const limiter = deps.limiter ?? defaultLimiter;
  const fetchImpl = deps.fetchImpl ?? fetch;

  const blocked = cloneGuard(config, context, limiter);
  if (blocked) return blocked;
  if (!looksLikeMp3(audio)) {
    return failure(
      400,
      'invalid_audio',
      'La muestra debe ser un archivo MP3 válido.',
    );
  }

  try {
    const form = new FormData();
    form.append('name', `Cope AI ${new Date().toISOString().slice(0, 19)}`);
    form.append(
      'files',
      new Blob([audio], { type: 'audio/mpeg' }),
      'muestra.mp3',
    );
    const response = await fetchImpl('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': config.elevenLabsApiKey! },
      body: form,
      signal: context.signal,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return failure(
        502,
        'voice_clone_failed',
        'El servicio de voz no pudo crear la voz. Revisá el plan y la muestra.',
      );
    }
    const payload = (await response.json().catch(() => null)) as {
      voice_id?: unknown;
    } | null;
    const voiceId =
      typeof payload?.voice_id === 'string' ? payload.voice_id.trim() : '';
    if (!VOICE_ID.test(voiceId)) {
      return failure(
        502,
        'voice_clone_failed',
        'El servicio de voz devolvió un identificador inválido.',
      );
    }
    return { ok: true, voiceId };
  } catch (error) {
    if (!(error instanceof AppError)) logError(error);
    const info = describeError(error);
    return failure(info.status, info.code, info.message);
  }
}

export async function deleteClonedVoice(
  voiceId: string,
  context: RequestContext,
  deps: Omit<VoiceCloneDeps, 'limiter'> = {},
): Promise<RouteFailure | { ok: true }> {
  const config = deps.config ?? readServerConfig();
  const fetchImpl = deps.fetchImpl ?? fetch;
  if (!VOICE_ID.test(voiceId)) {
    return failure(400, 'invalid_voice', 'El identificador de voz no es válido.');
  }
  if (!config.elevenLabsApiKey) {
    return failure(
      501,
      'voice_clone_not_configured',
      'La clonación de voz no está configurada.',
    );
  }
  if (!checkOwnerCode(config.voiceCloneCode, context.ownerCode)) {
    return failure(
      403,
      'owner_required',
      'La clonación de voz requiere el código de propietario.',
    );
  }
  try {
    const response = await fetchImpl(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
      {
        method: 'DELETE',
        headers: { 'xi-api-key': config.elevenLabsApiKey },
        signal: context.signal,
      },
    );
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return failure(
        502,
        'voice_delete_failed',
        'No se pudo borrar la voz en el servicio externo.',
      );
    }
    return { ok: true };
  } catch (error) {
    if (!(error instanceof AppError)) logError(error);
    const info = describeError(error);
    return failure(info.status, info.code, info.message);
  }
}
