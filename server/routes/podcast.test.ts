// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { podcastResponseSchema } from '../../shared/schemas/podcast';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import {
  sendJsonUpstream,
  startFakeUpstream,
  type FakeUpstream,
} from '../test/upstream';
import { preparePodcast } from './podcast';

let upstream: FakeUpstream | null = null;

afterEach(async () => {
  await upstream?.close();
  upstream = null;
});

const demoConfig = readServerConfig({ COPE_DEMO: '1' });
const context = { ip: '203.0.113.10', origin: null, host: null };
const validBody = { subject: 'math', level: 'secundaria' } as const;
const script =
  'Hoy repasamos fracciones con un ejemplo cotidiano. Primero identificamos el entero, después dividimos en partes iguales y comparamos. '.repeat(
    2,
  );

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

describe('preparePodcast', () => {
  it('genera un podcast demo válido', async () => {
    const result = await preparePodcast(validBody, context, {
      config: demoConfig,
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(podcastResponseSchema.safeParse(result.podcast).success).toBe(true);
    expect(result.podcast.demo).toBe(true);
    expect(result.podcast.script.length).toBeGreaterThan(80);
  });

  it('rechaza una solicitud inválida', async () => {
    const result = await preparePodcast(
      { subject: 'math', level: 'inventado' },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('aplica su propio rate limit', async () => {
    const limiter = new RateLimiter();
    const config = { ...demoConfig, studyRateLimitPerMinute: 1 };
    const first = await preparePodcast(validBody, context, { config, limiter });
    const second = await preparePodcast(validBody, context, { config, limiter });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it('parsea el guion del proveedor', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(
        response,
        JSON.stringify({ title: 'Fracciones en 5 minutos', script }),
      );
    });

    const result = await preparePodcast(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.podcast.demo).toBe(false);
    expect(result.podcast.title).toBe('Fracciones en 5 minutos');
    expect(result.podcast.script).toContain('fracciones');
  });

  it('falla si el proveedor no devuelve un guion válido', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      respondWith(response, 'esto no es json');
    });

    const result = await preparePodcast(validBody, context, {
      config: providerConfig(upstream.baseUrl),
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: 'podcast_parse_failed',
    });
  });
});
