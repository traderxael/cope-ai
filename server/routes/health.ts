import type { ServerConfig } from '../config.js';

export interface HealthPayload {
  ok: true;
  demo: boolean;
  configured: boolean;
  provider: ServerConfig['provider'];
  model: string | null;
  voice: {
    tts: boolean;
    clone: boolean;
  };
}

export function healthPayload(config: ServerConfig): HealthPayload {
  const tts = Boolean(config.elevenLabsApiKey && config.elevenLabsVoiceId);
  return {
    ok: true,
    demo: config.demo,
    configured: config.provider !== 'fixtures' && Boolean(config.model),
    provider: config.provider,
    model: config.model,
    voice: {
      tts,
      clone: Boolean(
        tts && config.voiceCloneEnabled && config.voiceCloneCode,
      ),
    },
  };
}
