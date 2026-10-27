// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import { deleteClonedVoice, prepareVoiceClone } from './voice-clone';

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
const mp3 = Buffer.concat([
  Buffer.from('ID3'),
  Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3]),
]);

describe('prepareVoiceClone', () => {
  it('está deshabilitada sin flag o sin código', async () => {
    const result = await prepareVoiceClone(mp3, context, {
      config: readServerConfig({
        ELEVENLABS_API_KEY: 'key',
        ELEVENLABS_VOICE_ID: 'voice',
      }),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('rechaza muestras que no son MP3', async () => {
    const result = await prepareVoiceClone(Buffer.from('no soy mp3'), context, {
      config: configured,
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('exige el código de propietario', async () => {
    const result = await prepareVoiceClone(
      mp3,
      { ...context, ownerCode: 'otro' },
      { config: configured, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('devuelve el voiceId del proveedor', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ voice_id: 'cloned-123' }), { status: 200 }),
    );
    const result = await prepareVoiceClone(mp3, context, {
      config: configured,
      limiter: new RateLimiter(),
      fetchImpl,
    });
    expect(result).toEqual({ ok: true, voiceId: 'cloned-123' });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/v1/voices/add'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('deleteClonedVoice', () => {
  it('borra la voz con el código correcto', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const result = await deleteClonedVoice('cloned-123', context, {
      config: configured,
      fetchImpl,
    });
    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/v1/voices/cloned-123'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('rechaza ids raros', async () => {
    const result = await deleteClonedVoice('../otro', context, {
      config: configured,
    });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});
