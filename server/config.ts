import { LIMITS } from '../shared/limits.js';

export type AiProvider = 'openai' | 'ollama' | 'pollinations' | 'fixtures';

export interface ServerConfig {
  provider: AiProvider;
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
  googleApiKey: string | null;
  googleModel: string | null;
  googleMaxTokens: number;
  googleJsonMode: boolean;
  openRouterApiKey: string | null;
  openRouterModel: string | null;
  openRouterMaxTokens: number;
  openRouterJsonMode: boolean;
  demoDelayMs: number;
  upstreamTimeoutMs: number;
  chatTimeoutMs: number;
  jsonAttemptTimeoutMs: number;
  jsonRouteBudgetMs: number;
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
  const openAiKey = env.OPENAI_API_KEY?.trim() || null;
  const openAiModel = env.OPENAI_MODEL?.trim() || null;
  const forcedDemo = env.COPE_DEMO === '1';
  const requested = (env.COPE_AI_PROVIDER?.trim().toLowerCase() || 'auto') as
    | 'auto'
    | AiProvider;
  const provider: AiProvider = forcedDemo
    ? 'fixtures'
    : requested === 'ollama' || (requested === 'auto' && env.COPE_LOCAL_AI === '1')
      ? 'ollama'
      : requested === 'pollinations'
        ? 'pollinations'
        : requested === 'openai'
          ? openAiKey && openAiModel
            ? 'openai'
            : 'pollinations'
          : openAiKey && openAiModel
            ? 'openai'
            : 'pollinations';

  const baseUrl =
    provider === 'pollinations'
      ? 'https://text.pollinations.ai/openai'
      : provider === 'ollama'
        ? normalizeBaseUrl(
            env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434/v1',
          )
        : normalizeBaseUrl(env.OPENAI_BASE_URL);
  const model =
    provider === 'fixtures'
      ? null
      : provider === 'pollinations'
        ? env.POLLINATIONS_MODEL?.trim() || 'openai'
        : provider === 'ollama'
          ? env.OLLAMA_MODEL?.trim() || 'qwen2.5:3b-cpu'
          : openAiModel;
  const apiKey =
    provider === 'fixtures'
      ? null
      : provider === 'pollinations'
        ? env.POLLINATIONS_API_KEY?.trim() || null
        : provider === 'ollama'
          ? env.OLLAMA_API_KEY?.trim() || 'ollama'
          : openAiKey;
  const tokenParam =
    env.OPENAI_TOKEN_PARAM === 'max_completion_tokens' &&
    provider !== 'pollinations'
      ? 'max_completion_tokens'
      : 'max_tokens';
  const slowLocalModel = provider === 'ollama';

  return {
    provider,
    apiKey,
    baseUrl,
    model,
    demo: provider === 'fixtures',
    jsonMode: provider !== 'pollinations' && env.OPENAI_JSON_MODE === '1',
    visionEnabled:
      provider === 'pollinations'
        ? false
        : provider === 'ollama'
          ? env.OLLAMA_VISION === '1'
          : env.OPENAI_VISION !== '0',
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
    googleApiKey: env.GOOGLE_API_KEY?.trim() || null,
    googleModel: env.GOOGLE_MODEL?.trim() || null,
    googleMaxTokens: readInteger(env.GOOGLE_MAX_TOKENS, LIMITS.maxOutputTokens, 1, 8192),
    googleJsonMode: env.GOOGLE_JSON_MODE === '1',
    openRouterApiKey: env.OPENROUTER_API_KEY?.trim() || null,
    openRouterModel: env.OPENROUTER_MODEL?.trim() || null,
    openRouterMaxTokens: readInteger(env.OPENROUTER_MAX_TOKENS, LIMITS.maxOutputTokens, 1, 8192),
    openRouterJsonMode: env.OPENROUTER_JSON_MODE === '1',
    demoDelayMs: readInteger(
      env.COPE_DEMO_DELAY_MS,
      LIMITS.demoDelayMs,
      0,
      2_000,
    ),
    upstreamTimeoutMs: LIMITS.upstreamTimeoutMs,
    chatTimeoutMs: slowLocalModel ? 180_000 : LIMITS.chatTimeoutMs,
    jsonAttemptTimeoutMs: slowLocalModel
      ? 180_000
      : LIMITS.jsonAttemptTimeoutMs,
    jsonRouteBudgetMs: slowLocalModel ? 240_000 : LIMITS.jsonRouteBudgetMs,
  };
}
