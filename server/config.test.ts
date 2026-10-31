import { describe, expect, it } from 'vitest';
import { LIMITS } from '../shared/limits';
import { readServerConfig } from './config';

describe('readServerConfig', () => {
  it('usa la IA gratuita sin clave por defecto', () => {
    const config = readServerConfig({});
    expect(config.provider).toBe('pollinations');
    expect(config.demo).toBe(false);
    expect(config.apiKey).toBeNull();
    expect(config.model).toBe('openai');
    expect(config.baseUrl).toContain('text.pollinations.ai');
    expect(config.chatTimeoutMs).toBe(LIMITS.chatTimeoutMs);
    expect(config.jsonAttemptTimeoutMs).toBe(
      LIMITS.freeCloudJsonAttemptTimeoutMs,
    );
    expect(config.jsonRouteBudgetMs).toBe(LIMITS.freeCloudJsonRouteBudgetMs);
    expect(config.jsonReasoningEffort).toBe('low');
    expect(config.oralReplyRateLimitPerMinute).toBe(
      LIMITS.oralReplyRateLimitPerMinute,
    );
  });

  it('permite ajustar el límite de respuestas del profesor', () => {
    const config = readServerConfig({
      COPE_ORAL_REPLY_RATE_LIMIT_PER_MINUTE: '7',
    });
    expect(config.oralReplyRateLimitPerMinute).toBe(7);
  });

  it('mantiene fixtures solo para pruebas explícitas', () => {
    const config = readServerConfig({ COPE_DEMO: '1' });
    expect(config.provider).toBe('fixtures');
    expect(config.demo).toBe(true);
  });

  it('ignora el modo demo en producción de Vercel', () => {
    const config = readServerConfig({
      COPE_DEMO: '1',
      VERCEL_ENV: 'production',
    });
    expect(config.provider).toBe('pollinations');
    expect(config.demo).toBe(false);
  });

  it('elige Ollama local con COPE_AI_PROVIDER=ollama', () => {
    const config = readServerConfig({
      COPE_AI_PROVIDER: 'ollama',
      OLLAMA_MODEL: 'qwen2.5:3b-cpu',
    });
    expect(config.provider).toBe('ollama');
    expect(config.demo).toBe(false);
    expect(config.baseUrl).toContain('127.0.0.1:11434');
    expect(config.model).toBe('qwen2.5:3b-cpu');
    expect(config.chatTimeoutMs).toBeGreaterThan(LIMITS.chatTimeoutMs);
    expect(config.jsonAttemptTimeoutMs).toBeGreaterThan(
      LIMITS.jsonAttemptTimeoutMs,
    );
    expect(config.jsonRouteBudgetMs).toBeGreaterThan(LIMITS.jsonRouteBudgetMs);
  });

  it('permite forzar Pollinations aunque exista clave OpenAI', () => {
    const config = readServerConfig({
      COPE_AI_PROVIDER: 'pollinations',
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'test-model',
    });
    expect(config.provider).toBe('pollinations');
    expect(config.apiKey).toBeNull();
  });

  it('configura el proveedor cuando hay clave y modelo', () => {
    const config = readServerConfig({
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'test-model',
      OPENAI_BASE_URL: 'http://localhost:1234/v1/',
    });
    expect(config.demo).toBe(false);
    expect(config.provider).toBe('openai');
    expect(config.apiKey).toBe('test-key');
    expect(config.model).toBe('test-model');
    expect(config.baseUrl).toBe('http://localhost:1234/v1');
  });

  it('COPE_DEMO fuerza demo y descarta la clave', () => {
    const config = readServerConfig({
      COPE_DEMO: '1',
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'test-model',
    });
    expect(config.demo).toBe(true);
    expect(config.apiKey).toBeNull();
  });

  it('sanea token param, base URL inválida y números', () => {
    const config = readServerConfig({
      OPENAI_API_KEY: 'k',
      OPENAI_MODEL: 'm',
      OPENAI_BASE_URL: 'ftp://no',
      OPENAI_TOKEN_PARAM: 'max_completion_tokens',
      OPENAI_VISION: '0',
      COPE_RATE_LIMIT_PER_MINUTE: '999',
      COPE_DEMO_DELAY_MS: '0',
    });
    expect(config.baseUrl).toBe('https://api.openai.com/v1');
    expect(config.tokenParam).toBe('max_completion_tokens');
    expect(config.visionEnabled).toBe(false);
    expect(config.rateLimitPerMinute).toBe(120);
    expect(config.demoDelayMs).toBe(0);
  });

  it('clampa valores inválidos', () => {
    const config = readServerConfig({
      COPE_RATE_LIMIT_PER_MINUTE: '0',
      COPE_DEMO_DELAY_MS: 'no',
    });
    expect(config.rateLimitPerMinute).toBe(1);
    expect(config.demoDelayMs).toBe(15);
  });
});
