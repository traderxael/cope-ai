import { quizContentSchema, type QuizQuestion } from './schemas/quiz.js';

function escapeInnerQuotes(value: string): string {
  let output = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (!inString) {
      if (character === '"') inString = true;
      output += character;
      continue;
    }
    if (escaped) {
      output += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      output += character;
      escaped = true;
      continue;
    }
    if (character !== '"') {
      output += character;
      continue;
    }
    let nextIndex = index + 1;
    while (nextIndex < value.length && /\s/.test(value[nextIndex]!)) {
      nextIndex += 1;
    }
    const next = value[nextIndex];
    if (
      next === ':' ||
      next === ',' ||
      next === '}' ||
      next === ']' ||
      next === undefined
    ) {
      inString = false;
      output += character;
    } else {
      output += '\\"';
    }
  }
  return output;
}

export function extractJsonObject(raw: string): unknown | null {
  if (!raw || !raw.trim()) return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  const json = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch {
    try {
      return JSON.parse(escapeInnerQuotes(json));
    } catch {
      return null;
    }
  }
}

export function parseQuizJson(raw: string): QuizQuestion[] | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const result = quizContentSchema.safeParse(json);
  return result.success ? result.data.questions : null;
}
