import { extractJsonObject } from './quiz-json.js';
import {
  flashcardContentSchema,
  studyPlanContentSchema,
  type FlashcardContentCard,
  type StudyPlanContent,
} from './schemas/study.js';

export function parseFlashcardsJson(
  raw: string,
): FlashcardContentCard[] | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const result = flashcardContentSchema.safeParse(json);
  return result.success ? result.data.cards : null;
}

export function parseStudyPlanJson(raw: string): StudyPlanContent | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const result = studyPlanContentSchema.safeParse(json);
  return result.success ? result.data : null;
}
