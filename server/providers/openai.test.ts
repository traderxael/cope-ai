// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../shared/schemas/chat';
import { LIMITS } from '../../shared/limits';
import type { ServerConfig } from '../config';
import {
  startFakeUpstream,
  finishSse,
  openSse,
  sendJsonUpstream,
  sendSseData,
  type FakeUpstream,
} from '../test/upstream';
import {
  buildUpstreamMessages,
  completeJson,
  hasImagesInMessages,
  openChatStream,
} from './openai';

let upstream: FakeUpstream | null = null;

afterEach(async () => {
  await upstream?.close();
  upstream = null;
});

function config(baseUrl: string, overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    provider: 'openai',
    apiKey: 'test-key',
    baseUrl,
    model: 'fake-model',
    demo: false,
    jsonMode: false,
    visionEnabled: true,
    tokenParam: 'max_tokens',
    rateLimitPerMinute: 10,
    quizRateLimitPerMinute: 5,
    studyRateLimitPerMinute: 5,
    oralRateLimitPerMinute: 3,
    ttsRateLimitPerMinute: 10,
    voiceCloneRateLimitPerMinute: 2,
    elevenLabsApiKey: null,
    elevenLabsVoiceId: null,
    elevenLabsModelId: 'eleven_multilingual_v2',
    voiceCloneEnabled: false,
    voiceCloneCode: null,
    demoDelayMs: 0,
    upstreamTimeoutMs: 1_000,
    chatTimeoutMs: LIMITS.chatTimeoutMs,
    jsonAttemptTimeoutMs: LIMITS.jsonAttemptTimeoutMs,
    jsonRouteBudgetMs: LIMITS.jsonRouteBudgetMs,
    ...overrides,
  };
}

const userMessage: ChatMessage[] = [{ role: 'user', content: 'Hola' }];

describe('mensajes upstream', () => {
  it('antepone system y quita imágenes de mensajes del asistente', () => {
    const messages: ChatMessage[] = [
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
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Veo la imagen' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,BBBB' },
          },
        ],
      },
    ];
    const upstreamMessages = buildUpstreamMessages('Sistema', messages);
    expect(upstreamMessages[0]).toEqual({ role: 'system', content: 'Sistema' });
    expect(Array.isArray(upstreamMessages[1]?.content)).toBe(true);
    expect(upstreamMessages[2]).toEqual({
      role: 'assistant',
      content: 'Veo la imagen',
    });
    expect(hasImagesInMessages(messages)).toBe(true);
  });
});

describe('openChatStream', () => {
  it('transmite deltas y envía el contrato esperado', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      openSse(response);
      sendSseData(response, { choices: [{ delta: { content: 'Hola' } }] });
      sendSseData(response, { choices: [{ delta: { content: ' mundo' } }] });
      finishSse(response);
    });

    const stream = await openChatStream({
      config: config(upstream.baseUrl),
      messages: userMessage,
      systemPrompt: 'Sistema',
      hasImages: false,
    });

    const chunks: string[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(chunks.join('')).toBe('Hola mundo');
    expect(upstream.requests).toHaveLength(1);
    expect(upstream.requests[0]?.url).toBe('/v1/chat/completions');
    expect(upstream.requests[0]?.headers.authorization).toBe('Bearer test-key');
    expect(upstream.requests[0]?.body).toMatchObject({
      model: 'fake-model',
      stream: true,
      max_tokens: 1_200,
    });
  });

  it('mapea 401 a error de configuración', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 401;
      response.end('{"error":"secreto"}');
    });

    await expect(
      openChatStream({
        config: config(upstream.baseUrl),
        messages: userMessage,
        systemPrompt: 'Sistema',
        hasImages: false,
      }),
    ).rejects.toMatchObject({ status: 502, code: 'provider_auth' });
  });

  it('mapea 400 con imágenes a visión no soportada', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 400;
      response.end('{"error":"vision"}');
    });

    await expect(
      openChatStream({
        config: config(upstream.baseUrl),
        messages: userMessage,
        systemPrompt: 'Sistema',
        hasImages: true,
      }),
    ).rejects.toMatchObject({ status: 422, code: 'vision_unsupported' });
  });

  it('mapea 429 del proveedor', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 429;
      response.end();
    });

    await expect(
      openChatStream({
        config: config(upstream.baseUrl),
        messages: userMessage,
        systemPrompt: 'Sistema',
        hasImages: false,
      }),
    ).rejects.toMatchObject({ status: 429, code: 'provider_rate_limited' });
  });

  it('corta por timeout', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      openSse(response);
      sendSseData(response, { choices: [{ delta: { content: 'parcial' } }] });
      // nunca termina
    });

    const stream = await openChatStream({
      config: config(upstream.baseUrl),
      messages: userMessage,
      systemPrompt: 'Sistema',
      hasImages: false,
      timeoutMs: 500,
    });

    const consume = async () => {
      for await (const _chunk of stream) {
        // consumir hasta el timeout
      }
    };
    await expect(consume()).rejects.toMatchObject({
      status: 504,
      code: 'provider_timeout',
    });
  });

  it('respeta el abort del cliente', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      openSse(response);
      sendSseData(response, { choices: [{ delta: { content: 'uno' } }] });
    });

    const controller = new AbortController();
    const stream = await openChatStream({
      config: config(upstream.baseUrl),
      messages: userMessage,
      systemPrompt: 'Sistema',
      hasImages: false,
      signal: controller.signal,
    });

    const consume = async () => {
      for await (const _chunk of stream) controller.abort();
    };
    await expect(consume()).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('completeJson', () => {
  it('devuelve el contenido y respeta response_format', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      sendJsonUpstream(response, {
        choices: [{ message: { content: '{"questions":[]}' } }],
      });
    });

    const raw = await completeJson({
      config: config(upstream.baseUrl, { jsonMode: true }),
      systemPrompt: 'Sistema',
      messages: [{ role: 'user', content: 'Generá' }],
    });

    expect(raw).toBe('{"questions":[]}');
    expect(upstream.requests[0]?.body).toMatchObject({
      stream: false,
      response_format: { type: 'json_object' },
    });
  });

  it('mapea un contenido vacío a provider_empty', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      sendJsonUpstream(response, { choices: [{ message: { content: '' } }] });
    });

    await expect(
      completeJson({
        config: config(upstream.baseUrl),
        systemPrompt: 'Sistema',
        messages: [{ role: 'user', content: 'Generá' }],
      }),
    ).rejects.toMatchObject({ code: 'provider_empty' });
  });

  it('mapea 401 de completeJson', async () => {
    upstream = await startFakeUpstream((_record, response) => {
      response.statusCode = 401;
      response.end();
    });

    await expect(
      completeJson({
        config: config(upstream.baseUrl),
        systemPrompt: 'Sistema',
        messages: [{ role: 'user', content: 'Generá' }],
      }),
    ).rejects.toMatchObject({ status: 502, code: 'provider_auth' });
  });
});
