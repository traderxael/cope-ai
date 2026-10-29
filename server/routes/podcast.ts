import { LIMITS } from '../../shared/limits.js';
import { podcastRequestSchema } from '../../shared/schemas/podcast.js';
import { parsePodcastJson } from '../../shared/podcast-json.js';
import type { PodcastResponse } from '../../shared/schemas/podcast.js';
import type { ServerConfig } from '../config.js';
import { readServerConfig } from '../config.js';
import { AppError, describeError, logError } from '../errors.js';
import {
  buildPodcastSystemPrompt,
  buildPodcastUserPrompt,
} from '../prompts/podcast.js';
import { demoPodcast } from '../providers/demo-podcast.js';
import { checkOrigin, defaultLimiter, type RateLimiter } from '../security.js';
import { generateValidatedJson } from './generate-json.js';
import type { RequestContext, RouteFailure } from './types.js';

export interface PodcastSuccess {
  ok: true;
  podcast: PodcastResponse;
}

export type PodcastResult = PodcastSuccess | RouteFailure;

export interface PodcastDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
}

export async function preparePodcast(
  body: unknown,
  context: RequestContext,
  deps: PodcastDeps = {},
): Promise<PodcastResult> {
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
    `podcast:${context.ip || 'unknown'}`,
    config.studyRateLimitPerMinute,
  );
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: `Demasiados podcasts seguidos. Esperá ${rate.retryAfterSeconds} segundos.`,
    };
  }

  const parsed = podcastRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      message: 'La solicitud del podcast no es válida.',
    };
  }

  const request = parsed.data;
  if (config.demo) {
    return {
      ok: true,
      podcast: { ...demoPodcast(request), demo: true },
    };
  }

  try {
    const content = await generateValidatedJson({
      config,
      systemPrompt: buildPodcastSystemPrompt(request.country),
      userPrompt: buildPodcastUserPrompt(request),
      signal: context.signal,
      maxTokens: LIMITS.maxPodcastOutputTokens,
      budgetMs: config.jsonRouteBudgetMs,
      attemptTimeoutMs: config.jsonAttemptTimeoutMs,
      parse: parsePodcastJson,
    });

    if (!content) {
      return {
        ok: false,
        status: 502,
        code: 'podcast_parse_failed',
        message:
          'No se pudo generar el podcast. Probá de nuevo o cambiá el tema.',
      };
    }

    return {
      ok: true,
      podcast: { ...content, demo: false },
    };
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
