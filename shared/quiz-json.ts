import { quizContentSchema, type QuizQuestion } from './schemas/quiz';

export function extractJsonObject(raw: string): unknown | null {
  if (!raw || !raw.trim()) return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function parseQuizJson(raw: string): QuizQuestion[] | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const result = quizContentSchema.safeParse(json);
  return result.success ? result.data.questions : null;
}
