// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { quizResponseSchema } from '../../shared/schemas/quiz';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import { makeQuestions } from '../test/quiz-fixture';
import {
  sendJsonUpstream,
  startFakeUpstream,
  type FakeUpstream,
} from '../test/upstream';
import { prepareQuiz } from './quiz';

let upstream: FakeUpstream | null = null;

afterEach(async () => {
  await upstream?.close();
  upstream = null;
});

const demoConfig = readServerConfig({ COPE_DEMO: '1' });
const context = { ip: '203.0.113.10', origin: null, host: null };
const validBody = { subject: 'math', level: 'secundaria' } as const;

function providerConfig(baseUrl: string) {
  return readServerConfig({
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'test-model',
    OPENAI_BASE_URL: baseUrl,
  });
}

describe('prepareQuiz', () => {
  it('genera una práctica demo válida', async () => {
    const result = await prepareQuiz(validBody, context, {
      config: demoConfig,
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(quizResponseSchema.safeParse(result.quiz).success).toBe(true);
    expect(result.quiz.demo).toBe(true);
    expect(result.quiz.questions).toHaveLength(5);
  });

  it('genera diez preguntas cuando se piden', async () => {
    const result = await prepareQuiz(
      { ...validBody, count: 10, difficulty: 'hard' },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quiz.questions).toHaveLength(10);
    expect(
      new Set(result.quiz.questions.map((question) => question.id)).size,
    ).toBe(10);
  });

  it('rechaza cantidades no soportadas', async () => {
    const result = await prepareQuiz(
      { ...validBody, count: 7 },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('rechaza una solicitud inválida', async () => {
    const result = await prepareQuiz(
      { subject: 'math' },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('aplica rate limit propio', async () => {
    const limiter = new RateLimiter();
    const config = { ...demoConfig, quizRateLimitPerMinute: 1 };
    const first = await prepareQuiz(validBody, context, { config, limiter });
    const second = await prepareQuiz(validBody, context, { config, limiter });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it('parsea una respuesta JSON del proveedor', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      sendJsonUpstream(response, {
        choices: [
          {
            message: {
              content: JSON.stringify({ questions: makeQuestions() }),
            },
          },
        ],
      });
    });

    const result = await prepareQuiz(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quiz.demo).toBe(false);
    expect(result.quiz.questions).toHaveLength(5);
  });

  it('parsea una práctica de diez preguntas del proveedor', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      sendJsonUpstream(response, {
        choices: [
          {
            message: {
              content: JSON.stringify({ questions: makeQuestions(10) }),
            },
          },
        ],
      });
    });

    const result = await prepareQuiz(
      { ...validBody, count: 10 },
      context,
      {
        config: providerConfig(upstream.baseUrl),
        limiter: new RateLimiter(),
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quiz.questions).toHaveLength(10);
  });

  it('tolera fences de markdown', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      sendJsonUpstream(response, {
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify({
                questions: makeQuestions(),
              })}\n\`\`\``,
            },
          },
        ],
      });
    });

    const result = await prepareQuiz(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
  });

  it('reintenta una vez y falla con JSON inválido', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      sendJsonUpstream(response, {
        choices: [{ message: { content: 'esto no es json' } }],
      });
    });

    const result = await prepareQuiz(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: 'quiz_parse_failed',
    });
    expect(upstream.requests).toHaveLength(2);
  });

  it('propaga el rate limit del proveedor', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 429;
      response.end();
    });

    const result = await prepareQuiz(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({ ok: false, status: 429 });
  });
});
