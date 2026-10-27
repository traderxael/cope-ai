// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import { prepareTts } from './tts';

const configured = readServerConfig({
  ELEVENLABS_API_KEY: 'eleven-key',
  ELEVENLABS_VOICE_ID: 'voice-123',
  COPE_VOICE_CLONE: '1',
  COPE_VOICE_CLONE_CODE: 'owner-secret',
});
const context = {
  ip: '203.0.113.10',
  origin: null,
  host: null,
  ownerCode: 'owner-secret',
};
const validBody = { text: 'Hola, esta es una pregunta del examen.' };

describe('prepareTts', () => {
  it('devuelve 501 si no hay voz externa configurada', async () => {
    const result = await prepareTts(validBody, context, {
      config: readServerConfig({}),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({ ok: false, status: 501 });
  });

  it('exige el código de propietario', async () => {
    const result = await prepareTts(validBody, { ...context, ownerCode: null }, {
      config: configured,
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('valida el texto antes de llamar al proveedor', async () => {
    const fetchImpl = vi.fn();
    const result = await prepareTts(
      { text: 'a'.repeat(601) },
      context,
      { config: configured, limiter: new RateLimiter(), fetchImpl },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('proxya el MP3 del proveedor', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      }),
    );
    const result = await prepareTts(validBody, context, {
      config: configured,
      limiter: new RateLimiter(),
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.audio]).toEqual([1, 2, 3, 4]);
    expect(result.contentType).toBe('audio/mpeg');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/v1/text-to-speech/voice-123'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('aplica rate limit', async () => {
    const limiter = new RateLimiter();
    const config = { ...configured, ttsRateLimitPerMinute: 1 };
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([1])));
    const first = await prepareTts(validBody, context, {
      config,
      limiter,
      fetchImpl,
    });
    const second = await prepareTts(validBody, context, {
      config,
      limiter,
      fetchImpl,
    });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, status: 429 });
  });
});
