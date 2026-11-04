import {
  oralExamRequestSchema,
  oralExamResponseSchema,
  oralGradeResponseSchema,
  oralReplyResponseSchema,
  type OralExamResponse,
  type OralGradeResponse,
  type OralReplyResponse,
} from '../../shared/schemas/oral-exam.js';
import { LIMITS } from '../../shared/limits.js';
import { oralOverallScore, oralZoneForScore } from '../../shared/oral-grade.js';
import {
  parseOralExamJson,
  parseOralGradeJson,
  parseOralReplyJson,
} from '../../shared/oral-exam-json.js';
import {
  DEFAULT_PERSONALITY,
  type PersonalityConfig,
} from '../../shared/types.js';
import type { ServerConfig } from '../config.js';
import { readServerConfig } from '../config.js';
import { AppError, describeError, logError } from '../errors.js';
import {
  buildOralExamSystemPrompt,
  buildOralExamUserPrompt,
  buildOralGradeSystemPrompt,
  buildOralGradeUserPrompt,
  buildOralReplySystemPrompt,
  buildOralReplyUserPrompt,
} from '../prompts/oral-exam.js';
import {
  demoOralExam,
  demoOralGrade,
  demoOralReply,
} from '../providers/demo-oral.js';
import { checkOrigin, defaultLimiter, type RateLimiter } from '../security.js';
import { generateValidatedJson } from './generate-json.js';
import type { RequestContext, RouteFailure } from './types.js';

export interface OralExamSuccess {
  ok: true;
  exam: OralExamResponse;
}

export interface OralGradeSuccess {
  ok: true;
  grade: OralGradeResponse;
}

export interface OralReplySuccess {
  ok: true;
  reply: OralReplyResponse;
}

export type OralExamResult =
  | OralExamSuccess
  | OralGradeSuccess
  | OralReplySuccess
  | RouteFailure;

export interface OralExamDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
}

function failure(status: number, code: string, message: string): RouteFailure {
  return { ok: false, status, code, message };
}

function personalityOf(
  request: { personality?: PersonalityConfig },
): PersonalityConfig {
  return request.personality ?? DEFAULT_PERSONALITY;
}

export async function prepareOralExam(
  body: unknown,
  context: RequestContext,
  deps: OralExamDeps = {},
): Promise<OralExamResult> {
  const config = deps.config ?? readServerConfig();
  const limiter = deps.limiter ?? defaultLimiter;

  if (!checkOrigin(context.origin, context.host)) {
    return failure(
      403,
      'forbidden_origin',
      'El origen de la solicitud no está permitido.',
    );
  }

  const requestedAction =
    typeof body === 'object' && body !== null
      ? (body as { action?: unknown }).action
      : null;
  const replying = requestedAction === 'reply';
  const rate = limiter.check(
    `${replying ? 'oral-reply' : 'oral'}:${context.ip || 'unknown'}`,
    replying
      ? config.oralReplyRateLimitPerMinute
      : config.oralRateLimitPerMinute,
  );
  if (!rate.allowed) {
    return failure(
      429,
      'rate_limited',
      replying
        ? `Demasiadas respuestas seguidas. Esperá ${rate.retryAfterSeconds} segundos.`
        : `Demasiados exámenes seguidos. Esperá ${rate.retryAfterSeconds} segundos.`,
    );
  }

  const parsed = oralExamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failure(
      400,
      'invalid_request',
      'La solicitud del examen oral no es válida.',
    );
  }

  const request = parsed.data;
  const personality = personalityOf(request);

  if (config.demo) {
    if (request.action === 'generate') {
      return { ok: true, exam: demoOralExam(request.config) };
    }
    if (request.action === 'reply') {
      return {
        ok: true,
        reply: demoOralReply(request.question, request.answer, request.stage),
      };
    }
    return {
      ok: true,
      grade: demoOralGrade(request.config, request.questions, request.answers),
    };
  }

  try {
    if (request.action === 'generate') {
      const content = await generateValidatedJson({
        config,
        systemPrompt: buildOralExamSystemPrompt(request.config, personality),
        userPrompt: buildOralExamUserPrompt(request.config),
        signal: context.signal,
        maxTokens: LIMITS.maxOralOutputTokens,
        budgetMs: config.jsonRouteBudgetMs,
        attemptTimeoutMs: config.jsonAttemptTimeoutMs,
        parse: (raw) => {
          const exam = parseOralExamJson(raw);
          return exam?.questions.length === request.config.count ? exam : null;
        },
      });
      if (!content) {
        return failure(
          502,
          'oral_exam_parse_failed',
          'No se pudo generar un examen oral válido. Probá de nuevo.',
        );
      }
      const exam: OralExamResponse = {
        title: content.title,
        questions: content.questions.map((question, index) => ({
          ...question,
          id: `q${index + 1}`,
        })),
        demo: false,
      };
      if (!oralExamResponseSchema.safeParse(exam).success) {
        return failure(
          502,
          'oral_exam_parse_failed',
          'El examen oral llegó en un formato inválido.',
        );
      }
      return { ok: true, exam };
    }

    if (request.action === 'reply') {
      const content = await generateValidatedJson({
        config,
        systemPrompt: buildOralReplySystemPrompt(
          request.config,
          personality,
          request.stage,
        ),
        userPrompt: buildOralReplyUserPrompt(
          request.question,
          request.answer,
          request.stage,
          request.followUp ?? '',
        ),
        signal: context.signal,
        maxTokens: LIMITS.maxOralOutputTokens,
        budgetMs: config.jsonRouteBudgetMs,
        attemptTimeoutMs: config.jsonAttemptTimeoutMs,
        parse: parseOralReplyJson,
      });
      if (!content) {
        return failure(
          502,
          'oral_reply_parse_failed',
          'No se pudo responder como profesor. Probá de nuevo.',
        );
      }
      const reply: OralReplyResponse = {
        reply: content.reply,
        // La repregunta solo tiene sentido después de la respuesta inicial.
        followUp: request.stage === 'initial' ? content.followUp : '',
        demo: false,
      };
      if (!oralReplyResponseSchema.safeParse(reply).success) {
        return failure(
          502,
          'oral_reply_parse_failed',
          'La respuesta del profesor llegó en un formato inválido.',
        );
      }
      return { ok: true, reply };
    }

    const content = await generateValidatedJson({
      config,
      systemPrompt: buildOralGradeSystemPrompt(request.config, personality),
      userPrompt: buildOralGradeUserPrompt(request.questions, request.answers),
      signal: context.signal,
      maxTokens: LIMITS.maxOralOutputTokens,
      parse: (raw) => {
        const grade = parseOralGradeJson(raw);
        if (!grade || grade.results.length !== request.questions.length) {
          return null;
        }
        const expectedIds = new Set(
          request.questions.map((question) => question.id),
        );
        const resultIds = new Set(
          grade.results.map((result) => result.questionId),
        );
        return resultIds.size === expectedIds.size &&
          [...expectedIds].every((id) => resultIds.has(id))
          ? grade
          : null;
      },
    });
    if (!content) {
      return failure(
        502,
        'oral_grade_parse_failed',
        'No se pudo corregir el examen oral. Probá de nuevo.',
      );
    }
    const overallScore = oralOverallScore(
      content.results.map((result) => result.score),
    );
    const grade: OralGradeResponse = {
      ...content,
      nextSteps:
        content.nextSteps.length > 0
          ? content.nextSteps
          : ['Repasá las mejoras señaladas y practicá de nuevo.'],
      overallScore,
      zone: oralZoneForScore(overallScore),
      demo: false,
    };
    if (!oralGradeResponseSchema.safeParse(grade).success) {
      return failure(
        502,
        'oral_grade_parse_failed',
        'La corrección llegó en un formato inválido.',
      );
    }
    return { ok: true, grade };
  } catch (error) {
    if (!(error instanceof AppError)) logError(error);
    const failureInfo = describeError(error);
    return {
      ok: false,
      status: failureInfo.status,
      code: failureInfo.code,
      message: failureInfo.message,
    };
  }
}
