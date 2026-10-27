import { LIMITS } from '../../shared/limits';
import { studyPlanRequestSchema } from '../../shared/schemas/study';
import { parseStudyPlanJson } from '../../shared/study-json';
import type { StudyPlanResponse } from '../../shared/types';
import type { ServerConfig } from '../config';
import { readServerConfig } from '../config';
import { AppError, describeError, logError } from '../errors';
import {
  buildStudyPlanSystemPrompt,
  buildStudyPlanUserPrompt,
} from '../prompts/study-plan';
import { demoStudyPlan } from '../providers/demo-study';
import { checkOrigin, defaultLimiter, type RateLimiter } from '../security';
import { generateValidatedJson } from './generate-json';
import type { RequestContext, RouteFailure } from './types';

export interface StudyPlanSuccess {
  ok: true;
  plan: StudyPlanResponse;
}

export type StudyPlanResult = StudyPlanSuccess | RouteFailure;

export interface StudyPlanDeps {
  config?: ServerConfig;
  limiter?: RateLimiter;
}

export async function prepareStudyPlan(
  body: unknown,
  context: RequestContext,
  deps: StudyPlanDeps = {},
): Promise<StudyPlanResult> {
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
    `plan:${context.ip || 'unknown'}`,
    config.studyRateLimitPerMinute,
  );
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: `Demasiados planes seguidos. Esperá ${rate.retryAfterSeconds} segundos.`,
    };
  }

  const parsed = studyPlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      message: 'El plan de estudio solicitado no es válido.',
    };
  }

  const request = parsed.data;

  const withTaskIds = (
    content: { title: string; days: Array<{ day: number; focus: string; tasks: Array<{ title: string; description?: string; minutes: number; type: 'study' | 'practice' | 'review' | 'rest' }> }> },
  ): StudyPlanResponse['plan'] => ({
    title: content.title,
    examDate: request.examDate,
    topics: request.topics,
    days: [...content.days]
      .sort((a, b) => a.day - b.day)
      .map((day) => ({
        day: day.day,
        focus: day.focus,
        tasks: day.tasks.map((task, index) => ({
          ...task,
          id: `d${day.day}-t${index + 1}`,
        })),
      })),
  });

  if (config.demo) {
    return {
      ok: true,
      plan: {
        plan: withTaskIds(demoStudyPlan(request)),
        demo: true,
      },
    };
  }

  try {
    const content = await generateValidatedJson({
      config,
      systemPrompt: buildStudyPlanSystemPrompt(request),
      userPrompt: buildStudyPlanUserPrompt(request),
      signal: context.signal,
      maxTokens: LIMITS.maxPlanOutputTokens,
      parse: (raw) => {
        const parsedPlan = parseStudyPlanJson(raw);
        return parsedPlan?.days.length === request.days ? parsedPlan : null;
      },
    });

    if (!content) {
      return {
        ok: false,
        status: 502,
        code: 'plan_parse_failed',
        message:
          'No se pudo generar un plan válido. Probá de nuevo o ajustá los días y temas.',
      };
    }

    return {
      ok: true,
      plan: {
        plan: withTaskIds(content),
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
