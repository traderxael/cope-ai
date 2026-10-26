import { parseQuizJson } from '../../shared/quiz-json';
import { quizRequestSchema } from '../../shared/schemas/quiz';
import type { QuizResponse } from '../../shared/types';
import type { ServerConfig } from '../config';
import { readServerConfig } from '../config';
import { AppError, describeError, logError } from '../errors';
import { buildQuizSystemPrompt, buildQuizUserPrompt } from '../prompts/quiz';
import { demoQuiz } from '../providers/demo';
import { completeJson } from '../providers/openai';
import { checkOrigin, defaultLimiter, type RateLimiter } from '../security';
import type { RequestContext, RouteFailure } from './types';

export interface QuizSuccess {
  ok: true;
  quiz: QuizResponse;
}

export type QuizResult = QuizSuccess | RouteFailure;

export interface QuizDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
}

const REPAIR_PROMPT =
  'Tu respuesta anterior no fue JSON válido o no cumplió el formato. Devolvé únicamente el objeto JSON solicitado, sin fences ni texto adicional.';

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
      quiz: { questions: demoQuiz(request.subject), demo: true },
    };
  }

  const systemPrompt = buildQuizSystemPrompt(request);
  const userPrompt = buildQuizUserPrompt(request);

  try {
    let raw = await completeJson({
      config,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      signal: context.signal,
    });

    let questions = parseQuizJson(raw);
    if (!questions) {
      raw = await completeJson({
        config,
        systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: raw.slice(0, 4_000) },
          { role: 'user', content: REPAIR_PROMPT },
        ],
        signal: context.signal,
      });
      questions = parseQuizJson(raw);
    }

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
