import { describe, expect, it } from 'vitest';
import { readServerConfig } from './config';

describe('readServerConfig', () => {
  it('activa demo sin clave o modelo', () => {
    const config = readServerConfig({});
    expect(config.demo).toBe(true);
    expect(config.apiKey).toBeNull();
    expect(config.baseUrl).toBe('https://api.openai.com/v1');
  });

  it('configura el proveedor cuando hay clave y modelo', () => {
    const config = readServerConfig({
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'test-model',
      OPENAI_BASE_URL: 'http://localhost:1234/v1/',
    });
    expect(config.demo).toBe(false);
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
