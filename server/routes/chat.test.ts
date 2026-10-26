// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { readServerConfig } from '../config';
import { RateLimiter } from '../security';
import {
  startFakeUpstream,
  type FakeUpstream,
} from '../test/upstream';
import { prepareChat } from './chat';

let upstream: FakeUpstream | null = null;

afterEach(async () => {
  await upstream?.close();
  upstream = null;
});

const demoConfig = readServerConfig({
  COPE_DEMO: '1',
  COPE_DEMO_DELAY_MS: '0',
});

const context = { ip: '203.0.113.9', origin: null, host: null };

const validBody = {
  mode: 'assistant',
  messages: [{ role: 'user', content: 'Hola Cope' }],
};

async function collect(stream: AsyncGenerator<string>): Promise<string> {
  let text = '';
  for await (const chunk of stream) text += chunk;
  return text;
}

describe('prepareChat', () => {
  it('responde en modo demo sin clave', async () => {
    const result = await prepareChat(validBody, context, {
      config: demoConfig,
      limiter: new RateLimiter(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.demo).toBe(true);
    expect(await collect(result.stream)).toContain('modo demo');
  });

  it('rechaza cuerpos inválidos', async () => {
    const result = await prepareChat(
      { mode: 'assistant', messages: [] },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      code: 'invalid_request',
    });
  });

  it('rechaza tutor sin materia', async () => {
    const result = await prepareChat(
      { mode: 'tutor', messages: [{ role: 'user', content: 'Ayuda' }] },
      context,
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('bloquea orígenes cruzados', async () => {
    const result = await prepareChat(
      validBody,
      { ...context, origin: 'https://malicioso.example', host: 'cope.app' },
      { config: demoConfig, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: 'forbidden_origin',
    });
  });

  it('aplica rate limit', async () => {
    const limiter = new RateLimiter();
    const config = { ...demoConfig, rateLimitPerMinute: 1 };
    const first = await prepareChat(validBody, context, { config, limiter });
    const second = await prepareChat(validBody, context, { config, limiter });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({
      ok: false,
      status: 429,
      code: 'rate_limited',
    });
  });

  it('rechaza imágenes si la visión está deshabilitada', async () => {
    const config = readServerConfig({
      COPE_DEMO: '1',
      COPE_DEMO_DELAY_MS: '0',
      OPENAI_VISION: '0',
    });
    const result = await prepareChat(
      {
        mode: 'assistant',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Mirá' },
              {
                type: 'image_url',
                image_url: { url: 'data:image/png;base64,AAAA' },
              },
            ],
          },
        ],
      },
      context,
      { config, limiter: new RateLimiter() },
    );
    expect(result).toMatchObject({
      ok: false,
      status: 422,
      code: 'vision_disabled',
    });
  });

  it('devuelve error amigable si el proveedor rechaza la clave', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 401;
      response.end();
    });
    const config = readServerConfig({
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'test-model',
      OPENAI_BASE_URL: upstream.baseUrl,
    });

    const result = await prepareChat(validBody, context, {
      config,
      limiter: new RateLimiter(),
    });
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: 'provider_auth',
    });
  });
});
