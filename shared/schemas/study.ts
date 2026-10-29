import { z } from 'zod';
import { CURRICULUM_COUNTRIES } from '../curriculum.js';
import { isValidDateOnly } from '../date.js';
import { LIMITS } from '../limits.js';
import {
  difficultySchema,
  levelSchema,
  subjectSchema,
} from './common.js';
import { responseLanguageSchema } from './personality.js';

const flashcardContentCardSchema = z.object({
  front: z.string().trim().min(3).max(300),
  back: z.string().trim().min(1).max(600),
  explanation: z.string().trim().min(1).max(500).optional(),
});

export const flashcardRequestSchema = z.object({
  subject: subjectSchema,
  level: levelSchema,
  topic: z
    .string()
    .trim()
    .max(LIMITS.maxTopicChars)
    .transform((value) => (value ? value : undefined))
    .optional(),
  count: z
    .union([z.literal(6), z.literal(8), z.literal(10)])
    .default(LIMITS.defaultFlashcards),
  country: z.enum(CURRICULUM_COUNTRIES).optional(),
  language: responseLanguageSchema.optional(),
  sourceText: z
    .string()
    .trim()
    .max(LIMITS.maxSourceTextChars)
    .transform((value) => (value ? value : undefined))
    .optional(),
});

export const flashcardContentSchema = z.object({
  cards: z
    .array(flashcardContentCardSchema)
    .min(LIMITS.minFlashcards)
    .max(LIMITS.maxFlashcards),
});

export const flashcardSchema = flashcardContentCardSchema.extend({
  id: z.string().trim().min(1).max(64),
});

export const flashcardResponseSchema = z.object({
  cards: z
    .array(flashcardSchema)
    .min(LIMITS.minFlashcards)
    .max(LIMITS.maxFlashcards),
  demo: z.boolean(),
});

export const planTaskTypeSchema = z.enum([
  'study',
  'practice',
  'review',
  'rest',
]);

export const planTaskContentSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(1).max(400).optional(),
  minutes: z
    .number()
    .int()
    .min(LIMITS.minPlanTaskMinutes)
    .max(LIMITS.maxPlanTaskMinutes),
  type: planTaskTypeSchema,
});

export const planDayContentSchema = z.object({
  day: z.number().int().min(1).max(LIMITS.maxPlanDays),
  focus: z.string().trim().min(3).max(160),
  tasks: z
    .array(planTaskContentSchema)
    .min(1)
    .max(LIMITS.maxPlanTasksPerDay),
});

export const studyPlanContentSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    days: z
      .array(planDayContentSchema)
      .min(LIMITS.minPlanDays)
      .max(LIMITS.maxPlanDays),
  })
  .superRefine((plan, ctx) => {
    const days = plan.days.map((day) => day.day);
    if (new Set(days).size !== days.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['days'],
        message: 'Los días del plan deben ser únicos.',
      });
      return;
    }
    const sorted = [...days].sort((a, b) => a - b);
    if (sorted.some((day, index) => day !== index + 1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['days'],
        message: 'Los días del plan deben ser contiguos desde el día 1.',
      });
    }
  });

export const studyPlanRequestSchema = z.object({
  subject: subjectSchema,
  level: levelSchema,
  difficulty: difficultySchema.default('medium'),
  country: z.enum(CURRICULUM_COUNTRIES).optional(),
  language: responseLanguageSchema.optional(),
  examDate: z
    .string()
    .trim()
    .refine(isValidDateOnly, 'La fecha del examen no es válida.'),
  topics: z
    .array(z.string().trim().min(1).max(80))
    .max(LIMITS.maxPlanTopics)
    .default([]),
  days: z
    .number()
    .int()
    .min(LIMITS.minPlanDays)
    .max(LIMITS.maxPlanDays)
    .default(LIMITS.defaultPlanDays),
});

export const planTaskSchema = planTaskContentSchema.extend({
  id: z.string().trim().min(1).max(64),
});

export const planDaySchema = planDayContentSchema.extend({
  tasks: z
    .array(planTaskSchema)
    .min(1)
    .max(LIMITS.maxPlanTasksPerDay),
});

export const studyPlanSchema = z.object({
  title: z.string().trim().min(3).max(120),
  examDate: z.string(),
  topics: z.array(z.string()),
  days: z
    .array(planDaySchema)
    .min(LIMITS.minPlanDays)
    .max(LIMITS.maxPlanDays),
});

export const studyPlanResponseSchema = z.object({
  plan: studyPlanSchema,
  demo: z.boolean(),
});

export type FlashcardRequest = z.infer<typeof flashcardRequestSchema>;
export type FlashcardContentCard = z.infer<typeof flashcardContentCardSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type FlashcardResponse = z.infer<typeof flashcardResponseSchema>;
export type PlanTaskType = z.infer<typeof planTaskTypeSchema>;
export type PlanTaskContent = z.infer<typeof planTaskContentSchema>;
export type PlanDayContent = z.infer<typeof planDayContentSchema>;
export type StudyPlanContent = z.infer<typeof studyPlanContentSchema>;
export type StudyPlanRequest = z.infer<typeof studyPlanRequestSchema>;
export type StudyPlanTask = z.infer<typeof planTaskSchema>;
export type StudyPlanDay = z.infer<typeof planDaySchema>;
export type StudyPlanContentResponse = z.infer<typeof studyPlanSchema>;
export type StudyPlanResponse = z.infer<typeof studyPlanResponseSchema>;
