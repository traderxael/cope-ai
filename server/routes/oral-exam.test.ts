// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import {
  oralExamResponseSchema,
  oralGradeResponseSchema,
  type OralQuestion,
} from '../../shared/schemas/oral-exam';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import {
  sendJsonUpstream,
  startFakeUpstream,
  type FakeUpstream,
} from '../test/upstream';
import { prepareOralExam } from './oral-exam';

let upstream: FakeUpstream | null = null;

afterEach(async () => {
  await upstream?.close();
  upstream = null;
});

const demoConfig = readServerConfig({ COPE_DEMO: '1' });
const context = { ip: '203.0.113.10', origin: null, host: null };
const configBody = {
  subject: 'physics',
  level: 'secundaria',
  difficulty: 'medium',
  topics: ['ley de Ohm'],
  count: 3,
} as const;

function makeQuestions(): OralQuestion[] {
  return Array.from({ length: 3 }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: `Pregunta oral número ${index + 1} de prueba.`,
    expectedPoints: ['Punto esperado uno', 'Punto esperado dos'],
    rubric: 'Explica, justifica y da un ejemplo.',
  }));
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

describe('prepareOralExam', () => {
  it('genera un examen demo válido', async () => {
    const result = await prepareOralExam(
      { action: 'generate', config: configBody },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !('exam' in result)) return;
    expect(oralExamResponseSchema.safeParse(result.exam).success).toBe(true);
    expect(result.exam.questions).toHaveLength(3);
    expect(result.exam.demo).toBe(true);
  });

  it('califica un examen demo con respuestas completas', async () => {
    const generated = await prepareOralExam(
      { action: 'generate', config: configBody },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    if (!generated.ok || !('exam' in generated)) throw new Error('sin examen');
    const result = await prepareOralExam(
      {
        action: 'grade',
        config: configBody,
        questions: generated.exam.questions,
        answers: generated.exam.questions.map((question) => ({
          questionId: question.id,
          answer: question.expectedPoints.join(' '),
        })),
      },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !('grade' in result)) return;
    expect(oralGradeResponseSchema.safeParse(result.grade).success).toBe(true);
    expect(result.grade.zone).toBe('segura');
  });

  it('rechaza solicitudes inválidas', async () => {
    const result = await prepareOralExam(
      { action: 'generate', config: { subject: 'math' } },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('aplica su propio rate limit', async () => {
    const limiter = new RateLimiter();
    const config = { ...demoConfig, oralRateLimitPerMinute: 1 };
    const first = await prepareOralExam(
      { action: 'generate', config: configBody },
      context,
      { config, limiter },
    );
    const second = await prepareOralExam(
      { action: 'generate', config: configBody },
      context,
      { config, limiter },
    );
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it('genera un examen del proveedor y asigna ids', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(
        response,
        JSON.stringify({
          title: 'Examen de física',
          questions: makeQuestions().map(({ id: _id, ...question }) => question),
        }),
      );
    });
    const result = await prepareOralExam(
      { action: 'generate', config: configBody },
      context,
      { config: providerConfig(upstream.baseUrl), limiter: new RateLimiter() },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !('exam' in result)) return;
    expect(result.exam.demo).toBe(false);
    expect(result.exam.questions.map((question) => question.id)).toEqual([
      'q1',
      'q2',
      'q3',
    ]);
  });

  it('califica con el proveedor y calcula la zona', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(
        response,
        JSON.stringify({
          results: makeQuestions().map((question) => ({
            questionId: question.id,
            score: 5,
            strengths: ['Precisión'],
            improvements: ['Agregar ejemplo'],
            modelAnswer: 'Respuesta modelo.',
          })),
          summary: 'Dominio sólido.',
          nextSteps: ['Practicar otro tema'],
        }),
      );
    });
    const result = await prepareOralExam(
      {
        action: 'grade',
        config: configBody,
        questions: makeQuestions(),
        answers: makeQuestions().map((question) => ({
          questionId: question.id,
          answer: 'Una respuesta completa.',
        })),
      },
      context,
      { config: providerConfig(upstream.baseUrl), limiter: new RateLimiter() },
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !('grade' in result)) return;
    expect(result.grade.overallScore).toBe(100);
    expect(result.grade.zone).toBe('segura');
    expect(result.grade.demo).toBe(false);
  });

  it('falla si el proveedor devuelve un examen inválido', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(response, 'no es json');
    });
    const result = await prepareOralExam(
      { action: 'generate', config: configBody },
      context,
      { config: providerConfig(upstream.baseUrl), limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: 'oral_exam_parse_failed',
    });
    expect(upstream.requests).toHaveLength(2);
  });
});
