import { z } from 'zod';
import { CURRICULUM_COUNTRIES } from '../curriculum.js';
import { EXAM_FORMATS } from '../exams.js';
import { LIMITS } from '../limits.js';
import { difficultySchema, levelSchema, subjectSchema } from './common.js';

const correctIndexSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const quizQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    prompt: z.string().trim().min(4).max(700),
    options: z.tuple([
      z.string().trim().min(1).max(300),
      z.string().trim().min(1).max(300),
      z.string().trim().min(1).max(300),
      z.string().trim().min(1).max(300),
    ]),
    correctIndex: correctIndexSchema,
    explanation: z.string().trim().min(4).max(700),
  })
  .superRefine((question, ctx) => {
    const normalized = question.options.map((option) =>
      option.trim().toLocaleLowerCase('es'),
    );
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Las opciones no pueden repetirse.',
      });
    }
  });

export const quizRequestSchema = z.object({
  subject: subjectSchema,
  level: levelSchema,
  topic: z
    .string()
    .trim()
    .max(LIMITS.maxTopicChars)
    .transform((value) => (value ? value : undefined))
    .optional(),
  count: z
    .union([z.literal(5), z.literal(10)])
    .default(LIMITS.defaultQuizQuestions),
  difficulty: difficultySchema.default('medium'),
  country: z.enum(CURRICULUM_COUNTRIES).optional(),
  examFormat: z.enum(EXAM_FORMATS).default('general'),
});

export const quizContentSchema = z.object({
  questions: z
    .array(quizQuestionSchema)
    .min(LIMITS.minQuizQuestions)
    .max(LIMITS.maxQuizQuestions),
});

export const quizResponseSchema = quizContentSchema.extend({
  demo: z.boolean(),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizRequest = z.infer<typeof quizRequestSchema>;
export type QuizContent = z.infer<typeof quizContentSchema>;
export type QuizResponse = z.infer<typeof quizResponseSchema>;
