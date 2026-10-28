import { LIMITS } from '../../shared/limits.js';
import { flashcardRequestSchema } from '../../shared/schemas/study.js';
import { parseFlashcardsJson } from '../../shared/study-json.js';
import type { FlashcardResponse } from '../../shared/types.js';
import type { ServerConfig } from '../config.js';
import { readServerConfig } from '../config.js';
import { AppError, describeError, logError } from '../errors.js';
import {
  buildFlashcardsSystemPrompt,
  buildFlashcardsUserPrompt,
} from '../prompts/flashcards.js';
import { demoFlashcards } from '../providers/demo-study.js';
import { checkOrigin, defaultLimiter, type RateLimiter } from '../security.js';
import { generateValidatedJson } from './generate-json.js';
import type { RequestContext, RouteFailure } from './types.js';

export interface FlashcardsSuccess {
  ok: true;
  flashcards: FlashcardResponse;
}

export type FlashcardsResult = FlashcardsSuccess | RouteFailure;

export interface FlashcardsDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
}

export async function prepareFlashcards(
  body: unknown,
  context: RequestContext,
  deps: FlashcardsDeps = {},
): Promise<FlashcardsResult> {
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
    `flashcards:${context.ip || 'unknown'}`,
    config.studyRateLimitPerMinute,
  );
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: `Demasiadas generaciones seguidas. Esperá ${rate.retryAfterSeconds} segundos.`,
    };
  }

  const parsed = flashcardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      message: 'La solicitud de flashcards no es válida.',
    };
  }

  const request = parsed.data;
  if (config.demo) {
    const cards = demoFlashcards(request.subject, request.count).map(
      (card, index) => ({
        ...card,
        id: `demo-fc-${index + 1}`,
      }),
    );
    return {
      ok: true,
      flashcards: { cards, demo: true },
    };
  }

  try {
    const cards = await generateValidatedJson({
      config,
      systemPrompt: buildFlashcardsSystemPrompt(request),
      userPrompt: buildFlashcardsUserPrompt(request),
      signal: context.signal,
      maxTokens: LIMITS.maxFlashcardOutputTokens,
      budgetMs: config.jsonRouteBudgetMs,
      attemptTimeoutMs: config.jsonAttemptTimeoutMs,
      parse: (raw) => {
        const parsedCards = parseFlashcardsJson(raw);
        return parsedCards?.length === request.count ? parsedCards : null;
      },
    });

    if (!cards) {
      return {
        ok: false,
        status: 502,
        code: 'flashcards_parse_failed',
        message:
          'No se pudieron generar flashcards válidas. Probá de nuevo o cambiá el tema.',
      };
    }

    return {
      ok: true,
      flashcards: {
        cards: cards.map((card, index) => ({
          ...card,
          id: `fc-${index + 1}`,
        })),
        demo: false,
      },
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
