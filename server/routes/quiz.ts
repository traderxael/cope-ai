import { LIMITS } from '../../shared/limits.js';
import { parseQuizJson } from '../../shared/quiz-json.js';
import { quizRequestSchema } from '../../shared/schemas/quiz.js';
import type { QuizResponse } from '../../shared/types.js';
import type { ServerConfig } from '../config.js';
import { readServerConfig } from '../config.js';
import { AppError, describeError, logError } from '../errors.js';
import { buildQuizSystemPrompt, buildQuizUserPrompt } from '../prompts/quiz.js';
import { demoQuiz } from '../providers/demo.js';
import { checkOrigin, defaultLimiter, type RateLimiter } from '../security.js';
import { generateValidatedJson } from './generate-json.js';
import type { RequestContext, RouteFailure } from './types.js';

export interface QuizSuccess {
  ok: true;
  quiz: QuizResponse;
}

export type QuizResult = QuizSuccess | RouteFailure;

export interface QuizDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
}

export async function prepareQuiz(
  body: unknown,
  context: RequestContext,
  deps: QuizDeps = {},
): Promise<QuizResult> {
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
    `quiz:${context.ip || 'unknown'}`,
    config.quizRateLimitPerMinute,
  );
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: `Demasiadas prácticas seguidas. Esperá ${rate.retryAfterSeconds} segundos.`,
    };
  }

  const parsed = quizRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      message: 'La práctica solicitada no es válida.',
    };
  }

  const request = parsed.data;
  if (config.demo) {
    return {
      ok: true,
      quiz: {
        questions: demoQuiz(request.subject, request.count),
        demo: true,
      },
    };
  }

  const systemPrompt = buildQuizSystemPrompt(request);
  const userPrompt = buildQuizUserPrompt(request);

  try {
    const questions = await generateValidatedJson({
      config,
      systemPrompt,
      userPrompt,
      signal: context.signal,
      maxTokens: LIMITS.maxQuizOutputTokens,
      budgetMs: config.jsonRouteBudgetMs,
      attemptTimeoutMs: config.jsonAttemptTimeoutMs,
      parse: (raw) => {
        const parsedQuestions = parseQuizJson(raw);
        return parsedQuestions?.length === request.count
          ? parsedQuestions
          : null;
      },
    });

    if (!questions) {
      return {
        ok: false,
        status: 502,
        code: 'quiz_parse_failed',
        message:
          'No se pudo generar una práctica válida. Probá de nuevo o cambiá el tema.',
      };
    }

    return {
      ok: true,
      quiz: { questions, demo: false },
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
