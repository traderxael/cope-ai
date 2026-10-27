// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { flashcardResponseSchema } from '../../shared/schemas/study';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import {
  sendJsonUpstream,
  startFakeUpstream,
  type FakeUpstream,
} from '../test/upstream';
import { prepareFlashcards } from './flashcards';

let upstream: FakeUpstream | null = null;

afterEach(async () => {
  await upstream?.close();
  upstream = null;
});

const demoConfig = readServerConfig({ COPE_DEMO: '1' });
const context = { ip: '203.0.113.10', origin: null, host: null };
const validBody = { subject: 'math', level: 'secundaria', count: 6 } as const;

function makeCards(count = 6) {
  return Array.from({ length: count }, (_, index) => ({
    front: `Pregunta ${index + 1} de prueba`,
    back: `Respuesta ${index + 1}`,
    explanation: `Explicación ${index + 1}`,
  }));
}

function providerConfig(baseUrl: string) {
  return readServerConfig({
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'test-model',
    OPENAI_BASE_URL: baseUrl,
  });
}

function respondWith(response: Parameters<typeof sendJsonUpstream>[0], content: string) {
  sendJsonUpstream(response, {
    choices: [{ message: { content } }],
  });
}

describe('prepareFlashcards', () => {
  it('genera un deck demo válido del tamaño pedido', async () => {
    const result = await prepareFlashcards(validBody, context, {
      config: demoConfig,
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(flashcardResponseSchema.safeParse(result.flashcards).success).toBe(
      true,
    );
    expect(result.flashcards.demo).toBe(true);
    expect(result.flashcards.cards).toHaveLength(6);
    expect(new Set(result.flashcards.cards.map((card) => card.id)).size).toBe(
      6,
    );
  });

  it('rechaza cantidades fuera de 6, 8 o 10', async () => {
    const result = await prepareFlashcards(
      { subject: 'math', level: 'secundaria', count: 7 },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('aplica su propio rate limit', async () => {
    const limiter = new RateLimiter();
    const config = { ...demoConfig, studyRateLimitPerMinute: 1 };
    const first = await prepareFlashcards(validBody, context, {
      config,
      limiter,
    });
    const second = await prepareFlashcards(validBody, context, {
      config,
      limiter,
    });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it('parsea tarjetas del proveedor y les agrega ids', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(response, JSON.stringify({ cards: makeCards(6) }));
    });

    const result = await prepareFlashcards(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.flashcards.demo).toBe(false);
    expect(result.flashcards.cards[0]).toMatchObject({
      id: 'fc-1',
      front: 'Pregunta 1 de prueba',
    });
    expect(result.flashcards.cards[5]?.id).toBe('fc-6');
  });

  it('repara una respuesta inválida con un segundo intento', async () => {
    let calls = 0;
    upstream = await startFakeUpstream((_record, response) => {
      calls += 1;
      respondWith(
        response,
        calls === 1
          ? 'esto no es json'
          : JSON.stringify({ cards: makeCards(6) }),
      );
    });

    const result = await prepareFlashcards(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    expect(upstream.requests).toHaveLength(2);
  });

  it('falla si el proveedor no respeta la cantidad pedida', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(response, JSON.stringify({ cards: makeCards(8) }));
    });

    const result = await prepareFlashcards(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: 'flashcards_parse_failed',
    });
    expect(upstream.requests).toHaveLength(2);
  });

  it('propaga el rate limit del proveedor', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 429;
      response.end();
    });

    const result = await prepareFlashcards(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({ ok: false, status: 429 });
  });
});
