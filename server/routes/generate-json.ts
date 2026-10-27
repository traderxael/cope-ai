import type { ServerConfig } from '../config';
import { completeJson } from '../providers/openai';

const REPAIR_PROMPT =
  'Tu respuesta anterior no fue JSON válido o no cumplió el formato. Devolvé únicamente el objeto JSON solicitado, sin fences ni texto adicional.';

export async function generateValidatedJson<T>(options: {
  config: ServerConfig;
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
  maxTokens: number;
  parse: (raw: string) => T | null;
}): Promise<T | null> {
  let raw = await completeJson({
    config: options.config,
    systemPrompt: options.systemPrompt,
    messages: [{ role: 'user', content: options.userPrompt }],
    signal: options.signal,
    maxTokens: options.maxTokens,
  });

  const first = options.parse(raw);
  if (first) return first;

  raw = await completeJson({
    config: options.config,
    systemPrompt: options.systemPrompt,
    messages: [
      { role: 'user', content: options.userPrompt },
      { role: 'assistant', content: raw.slice(0, 8_000) },
      { role: 'user', content: REPAIR_PROMPT },
    ],
    signal: options.signal,
    maxTokens: options.maxTokens,
  });

  return options.parse(raw);
}
