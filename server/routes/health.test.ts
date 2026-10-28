import { describe, expect, it } from 'vitest';
import { readServerConfig } from '../config';
import { healthPayload } from './health';

describe('healthPayload', () => {
  it('informa demo y voz deshabilitada', () => {
    expect(healthPayload(readServerConfig({}))).toMatchObject({
      ok: true,
      demo: false,
      configured: true,
      provider: 'pollinations',
      voice: { tts: false, clone: false },
    });
  });

  it('informa las capacidades de voz sin exponer claves', () => {
    const payload = healthPayload(
      readServerConfig({
        ELEVENLABS_API_KEY: 'key-secreta',
        ELEVENLABS_VOICE_ID: 'voice-1',
        COPE_VOICE_CLONE: '1',
        COPE_VOICE_CLONE_CODE: 'codigo',
      }),
    );
    expect(payload.voice).toEqual({ tts: true, clone: true });
    expect(JSON.stringify(payload)).not.toContain('key-secreta');
    expect(JSON.stringify(payload)).not.toContain('codigo');
  });
});
