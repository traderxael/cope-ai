import { z } from 'zod';
import { CURRICULUM_COUNTRIES } from '../curriculum.js';
import { LIMITS } from '../limits.js';
import { difficultySchema, levelSchema, subjectSchema } from './common.js';
import { personalityConfigSchema } from './personality.js';

export const ORAL_EXAM_COUNTS = [3, 5, 8] as const;

const topicSchema = z.string().trim().min(1).max(80);

export const oralExamConfigSchema = z.object({
  subject: subjectSchema,
  level: levelSchema,
  difficulty: difficultySchema.default('medium'),
  country: z.enum(CURRICULUM_COUNTRIES).optional(),
  topics: z
    .array(topicSchema)
    .max(LIMITS.maxOralTopics)
    .default([])
    .transform((topics) => [...new Set(topics)]),
  count: z
    .union([z.literal(3), z.literal(5), z.literal(8)])
    .default(LIMITS.defaultOralExamQuestions),
});

export const oralQuestionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  prompt: z.string().trim().min(10).max(600),
  expectedPoints: z
    .array(z.string().trim().min(1).max(300))
    .min(2)
    .max(8),
  rubric: z.string().trim().min(1).max(800),
});

export const oralQuestionContentSchema = oralQuestionSchema.omit({ id: true });

export const oralExamContentSchema = z.object({
  title: z.string().trim().min(3).max(120),
  questions: z
    .array(oralQuestionContentSchema)
    .min(LIMITS.minOralExamQuestions)
    .max(LIMITS.maxOralExamQuestions),
});

export const oralExamResponseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  questions: z
    .array(oralQuestionSchema)
    .min(LIMITS.minOralExamQuestions)
    .max(LIMITS.maxOralExamQuestions),
  demo: z.boolean(),
});

export const oralGradeResultSchema = z.object({
  questionId: z.string().trim().min(1).max(64),
  score: z.number().int().min(0).max(5),
  strengths: z.array(z.string().trim().min(1).max(300)).max(4).default([]),
  improvements: z
    .array(z.string().trim().min(1).max(300))
    .max(4)
    .default([]),
  modelAnswer: z.string().trim().min(1).max(1_500),
});

export const oralGradeContentSchema = z.object({
  results: z
    .array(oralGradeResultSchema)
    .min(1)
    .max(LIMITS.maxOralExamQuestions),
  summary: z.string().trim().min(1).max(1_200),
  nextSteps: z.array(z.string().trim().min(1).max(300)).max(4).default([]),
});

export const oralGradeResponseSchema = oralGradeContentSchema.extend({
  overallScore: z.number().int().min(0).max(100),
  zone: z.enum(['segura', 'practica', 'refuerzo']),
  demo: z.boolean(),
});

const oralAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(64),
  answer: z.string().trim().max(LIMITS.maxOralAnswerChars),
});

export const oralExamRequestSchema = z
  .discriminatedUnion('action', [
    z.object({
      action: z.literal('generate'),
      config: oralExamConfigSchema,
      personality: personalityConfigSchema.optional(),
    }),
    z.object({
      action: z.literal('grade'),
      config: oralExamConfigSchema,
      personality: personalityConfigSchema.optional(),
      questions: z
        .array(oralQuestionSchema)
        .min(LIMITS.minOralExamQuestions)
        .max(LIMITS.maxOralExamQuestions),
      answers: z
        .array(oralAnswerSchema)
        .min(LIMITS.minOralExamQuestions)
        .max(LIMITS.maxOralExamQuestions),
    }),
  ])
  .superRefine((request, ctx) => {
    if (request.action !== 'grade') return;
    const questionIds = new Set(
      request.questions.map((question) => question.id),
    );
    if (questionIds.size !== request.questions.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'Las preguntas deben tener ids únicos.',
      });
    }
    if (request.answers.length !== request.questions.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['answers'],
        message: 'Debe haber una respuesta por pregunta.',
      });
    }
    if (
      request.answers.some((answer) => !questionIds.has(answer.questionId))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['answers'],
        message: 'Hay una respuesta para una pregunta desconocida.',
      });
    }
  });

export type OralExamConfig = z.infer<typeof oralExamConfigSchema>;
export type OralQuestion = z.infer<typeof oralQuestionSchema>;
export type OralQuestionContent = z.infer<typeof oralQuestionContentSchema>;
export type OralExamContent = z.infer<typeof oralExamContentSchema>;
export type OralExamResponse = z.infer<typeof oralExamResponseSchema>;
export type OralGradeResult = z.infer<typeof oralGradeResultSchema>;
export type OralGradeContent = z.infer<typeof oralGradeContentSchema>;
export type OralGradeResponse = z.infer<typeof oralGradeResponseSchema>;
export type OralExamRequest = z.infer<typeof oralExamRequestSchema>;
