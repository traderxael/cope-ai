// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { studyPlanResponseSchema } from '../../shared/schemas/study';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import {
  sendJsonUpstream,
  startFakeUpstream,
  type FakeUpstream,
} from '../test/upstream';
import { prepareStudyPlan } from './study-plan';

let upstream: FakeUpstream | null = null;

afterEach(async () => {
  await upstream?.close();
  upstream = null;
});

const demoConfig = readServerConfig({ COPE_DEMO: '1' });
const context = { ip: '203.0.113.10', origin: null, host: null };
const validBody = {
  subject: 'math',
  level: 'secundaria',
  examDate: '2026-11-10',
  topics: ['derivadas', 'límites'],
  days: 3,
} as const;

function makePlanContent(days = 3) {
  return {
    title: 'Plan de matemáticas de prueba',
    days: Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      focus: `Tema ${index + 1}`,
      tasks: [
        {
          title: `Estudiar tema ${index + 1}`,
          description: 'Leer y resumir.',
          minutes: 40,
          type: 'study',
        },
        {
          title: `Practicar tema ${index + 1}`,
          minutes: 30,
          type: 'practice',
        },
      ],
    })),
  };
}

function providerConfig(baseUrl: string) {
  return readServerConfig({
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'test-model',
    OPENAI_BASE_URL: baseUrl,
  });
}

function respondWith(
  response: Parameters<typeof sendJsonUpstream>[0],
  content: string,
) {
  sendJsonUpstream(response, {
    choices: [{ message: { content } }],
  });
}

describe('prepareStudyPlan', () => {
  it('genera un plan demo con fechas y temas de la solicitud', async () => {
    const result = await prepareStudyPlan(validBody, context, {
      config: demoConfig,
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(studyPlanResponseSchema.safeParse(result.plan).success).toBe(true);
    expect(result.plan.demo).toBe(true);
    expect(result.plan.plan.days).toHaveLength(3);
    expect(result.plan.plan.examDate).toBe(validBody.examDate);
    expect(result.plan.plan.topics).toEqual(validBody.topics);
    expect(result.plan.plan.days[0]?.tasks[0]?.id).toBe('d1-t1');
  });

  it('rechaza fechas inválidas', async () => {
    const result = await prepareStudyPlan(
      { ...validBody, examDate: '2026-02-30' },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('aplica su propio rate limit', async () => {
    const limiter = new RateLimiter();
    const config = { ...demoConfig, studyRateLimitPerMinute: 1 };
    const first = await prepareStudyPlan(validBody, context, {
      config,
      limiter,
    });
    const second = await prepareStudyPlan(validBody, context, {
      config,
      limiter,
    });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it('ordena los días y agrega ids de tareas del proveedor', async () => {
    const content = makePlanContent(3);
    content.days.reverse();
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(response, JSON.stringify(content));
    });

    const result = await prepareStudyPlan(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.demo).toBe(false);
    expect(result.plan.plan.days.map((day) => day.day)).toEqual([1, 2, 3]);
    expect(result.plan.plan.days[0]?.tasks.map((task) => task.id)).toEqual([
      'd1-t1',
      'd1-t2',
    ]);
  });

  it('repara una respuesta inválida con un segundo intento', async () => {
    let calls = 0;
    upstream = await startFakeUpstream((_record, response) => {
      calls += 1;
      respondWith(
        response,
        calls === 1
          ? 'plan incompleto'
          : JSON.stringify(makePlanContent(3)),
      );
    });

    const result = await prepareStudyPlan(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    expect(upstream.requests).toHaveLength(2);
  });

  it('falla si el proveedor devuelve otra cantidad de días', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(response, JSON.stringify(makePlanContent(5)));
    });

    const result = await prepareStudyPlan(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: 'plan_parse_failed',
    });
    expect(upstream.requests).toHaveLength(2);
  });

  it('propaga el rate limit del proveedor', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 429;
      response.end();
    });

    const result = await prepareStudyPlan(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({ ok: false, status: 429 });
  });
});
