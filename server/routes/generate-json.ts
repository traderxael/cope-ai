import { LIMITS } from '../../shared/limits.js';
import type { ServerConfig } from '../config.js';
import { completeJson, type JsonCompletionOptions } from '../providers/openai.js';

const REPAIR_PROMPT =
  'Tu respuesta anterior no fue JSON válido o no cumplió el formato. Devolvé únicamente el objeto JSON solicitado, sin fences ni texto adicional.';

type CompleteJson = (options: JsonCompletionOptions) => Promise<string>;

export interface GenerateJsonDeps {
  complete?: CompleteJson;
  now?: () => number;
}

export async function generateValidatedJson<T>(
  options: {
    config: ServerConfig;
    systemPrompt: string;
    userPrompt: string;
    signal?: AbortSignal;
    maxTokens: number;
    budgetMs?: number;
    attemptTimeoutMs?: number;
    parse: (raw: string) => T | null;
  },
  deps: GenerateJsonDeps = {},
): Promise<T | null> {
  const complete = deps.complete ?? completeJson;
  const now = deps.now ?? Date.now;
  const budgetMs = options.budgetMs ?? LIMITS.jsonRouteBudgetMs;
  const deadline = now() + budgetMs;

  const remainingBudget = () => deadline - now();
  const attemptTimeout = () =>
    Math.max(
      1_000,
      Math.min(
        options.attemptTimeoutMs ?? LIMITS.jsonAttemptTimeoutMs,
        remainingBudget(),
      ),
    );

  let raw = await complete({
    config: options.config,
    systemPrompt: options.systemPrompt,
    messages: [{ role: 'user', content: options.userPrompt }],
    signal: options.signal,
    maxTokens: options.maxTokens,
    timeoutMs: attemptTimeout(),
  });

  const first = options.parse(raw);
  if (first) return first;

  if (remainingBudget() < LIMITS.jsonRepairMinRemainingMs) return null;

  raw = await complete({
    config: options.config,
    systemPrompt: options.systemPrompt,
    messages: [
      { role: 'user', content: options.userPrompt },
      { role: 'assistant', content: raw.slice(0, 8_000) },
      { role: 'user', content: REPAIR_PROMPT },
    ],
    signal: options.signal,
    maxTokens: options.maxTokens,
    timeoutMs: attemptTimeout(),
  });

  return options.parse(raw);
}
