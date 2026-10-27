import { extractJsonObject } from './quiz-json.js';
import {
  oralExamContentSchema,
  oralGradeContentSchema,
  type OralExamContent,
  type OralGradeContent,
} from './schemas/oral-exam.js';

export function parseOralExamJson(raw: string): OralExamContent | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const parsed = oralExamContentSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function parseOralGradeJson(raw: string): OralGradeContent | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const parsed = oralGradeContentSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
