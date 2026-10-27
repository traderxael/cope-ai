import { LIMITS } from '../shared/limits.js';

export interface ServerConfig {
  apiKey: string | null;
  baseUrl: string;
  model: string | null;
  demo: boolean;
  jsonMode: boolean;
  visionEnabled: boolean;
  tokenParam: 'max_tokens' | 'max_completion_tokens';
  rateLimitPerMinute: number;
  quizRateLimitPerMinute: number;
  studyRateLimitPerMinute: number;
  oralRateLimitPerMinute: number;
  ttsRateLimitPerMinute: number;
  voiceCloneRateLimitPerMinute: number;
  elevenLabsApiKey: string | null;
  elevenLabsVoiceId: string | null;
  elevenLabsModelId: string;
  voiceCloneEnabled: boolean;
  voiceCloneCode: string | null;
  demoDelayMs: number;
  upstreamTimeoutMs: number;
}

function normalizeBaseUrl(value: string | undefined): string {
  const candidate = value?.trim() || 'https://api.openai.com/v1';
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return 'https://api.openai.com/v1';
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return 'https://api.openai.com/v1';
  }
}

function readInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function readServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const apiKey = env.OPENAI_API_KEY?.trim() || null;
  const model = env.OPENAI_MODEL?.trim() || null;
  const forcedDemo = env.COPE_DEMO === '1';
  const configured = Boolean(apiKey && model) && !forcedDemo;
  const tokenParam =
    env.OPENAI_TOKEN_PARAM === 'max_completion_tokens'
      ? 'max_completion_tokens'
      : 'max_tokens';

  return {
    apiKey: configured ? apiKey : null,
    baseUrl: normalizeBaseUrl(env.OPENAI_BASE_URL),
    model,
    demo: !configured,
    jsonMode: env.OPENAI_JSON_MODE === '1',
    visionEnabled: env.OPENAI_VISION !== '0',
    tokenParam,
    rateLimitPerMinute: readInteger(
      env.COPE_RATE_LIMIT_PER_MINUTE,
      LIMITS.rateLimitPerMinute,
      1,
      120,
    ),
    quizRateLimitPerMinute: readInteger(
      env.COPE_QUIZ_RATE_LIMIT_PER_MINUTE,
      LIMITS.quizRateLimitPerMinute,
      1,
      60,
    ),
    studyRateLimitPerMinute: readInteger(
      env.COPE_STUDY_RATE_LIMIT_PER_MINUTE,
      LIMITS.studyRateLimitPerMinute,
      1,
      60,
    ),
    oralRateLimitPerMinute: readInteger(
      env.COPE_ORAL_RATE_LIMIT_PER_MINUTE,
      LIMITS.oralRateLimitPerMinute,
      1,
      30,
    ),
    ttsRateLimitPerMinute: readInteger(
      env.COPE_TTS_RATE_LIMIT_PER_MINUTE,
      LIMITS.ttsRateLimitPerMinute,
      1,
      60,
    ),
    voiceCloneRateLimitPerMinute: readInteger(
      env.COPE_VOICE_CLONE_RATE_LIMIT_PER_MINUTE,
      LIMITS.voiceCloneRateLimitPerMinute,
      1,
      10,
    ),
    elevenLabsApiKey: env.ELEVENLABS_API_KEY?.trim() || null,
    elevenLabsVoiceId: env.ELEVENLABS_VOICE_ID?.trim() || null,
    elevenLabsModelId:
      env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2',
    voiceCloneEnabled: env.COPE_VOICE_CLONE === '1',
    voiceCloneCode: env.COPE_VOICE_CLONE_CODE?.trim() || null,
    demoDelayMs: readInteger(
      env.COPE_DEMO_DELAY_MS,
      LIMITS.demoDelayMs,
      0,
      2_000,
    ),
    upstreamTimeoutMs: LIMITS.upstreamTimeoutMs,
  };
}
