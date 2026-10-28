import { describe, expect, it, vi } from 'vitest';
import type { ServerConfig } from '../config';
import { readServerConfig } from '../config';
import { generateValidatedJson } from './generate-json';

const config: ServerConfig = readServerConfig({ COPE_DEMO: '1' });

interface CompleteOptions {
  timeoutMs?: number;
}

function run(options: {
  elapsedMs: number;
  budgetMs: number;
  attemptTimeoutMs?: number;
  first: string;
  second?: string;
}) {
  let now = 0;
  const timeouts: number[] = [];
  const complete = vi.fn(async (call: CompleteOptions) => {
    timeouts.push(call.timeoutMs ?? -1);
    now += options.elapsedMs;
    return timeouts.length === 1 ? options.first : (options.second ?? '');
  });

  const result = generateValidatedJson(
    {
      config,
      systemPrompt: 'sistema',
      userPrompt: 'usuario',
      maxTokens: 100,
      budgetMs: options.budgetMs,
      attemptTimeoutMs: options.attemptTimeoutMs,
      parse: (raw) =>
        raw.startsWith('{"ok"') ? { ok: true } : null,
    },
    { complete, now: () => now },
  );

  return { result, timeouts, complete };
}

describe('generateValidatedJson budget', () => {
  it('limpia el JSON inválido con una reparación dentro del presupuesto', async () => {
    const { result, timeouts } = run({
      elapsedMs: 5_000,
      budgetMs: 50_000,
      first: 'no es json',
      second: '{"ok":true}',
    });
    await expect(result).resolves.toEqual({ ok: true });
    expect(timeouts).toEqual([45_000, 45_000]);
  });

  it('usa el timeout de intento configurado para modelos lentos', async () => {
    const { result, timeouts } = run({
      elapsedMs: 5_000,
      budgetMs: 240_000,
      attemptTimeoutMs: 180_000,
      first: 'no es json',
      second: '{"ok":true}',
    });
    await expect(result).resolves.toEqual({ ok: true });
    expect(timeouts).toEqual([180_000, 180_000]);
  });

  it('acorta la reparación al tiempo restante', async () => {
    const { result, timeouts } = run({
      elapsedMs: 20_000,
      budgetMs: 50_000,
      first: 'no es json',
      second: '{"ok":true}',
    });
    await expect(result).resolves.toEqual({ ok: true });
    expect(timeouts).toEqual([45_000, 30_000]);
  });

  it('no intenta reparar si quedan menos de 20 segundos', async () => {
    const { result, timeouts, complete } = run({
      elapsedMs: 35_000,
      budgetMs: 50_000,
      first: 'no es json',
      second: '{"ok":true}',
    });
    await expect(result).resolves.toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(timeouts).toEqual([45_000]);
  });

  it('no hace una segunda llamada si la primera ya es válida', async () => {
    const { result, complete } = run({
      elapsedMs: 1_000,
      budgetMs: 50_000,
      first: '{"ok":true}',
    });
    await expect(result).resolves.toEqual({ ok: true });
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
