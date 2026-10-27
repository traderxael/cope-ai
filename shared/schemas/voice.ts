import { z } from 'zod';
import { LIMITS } from '../limits.js';

const voiceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'El identificador de voz no es válido.');

export const ttsRequestSchema = z.object({
  text: z.string().trim().min(1).max(LIMITS.maxTtsChars),
  voiceId: voiceIdSchema.optional(),
});

export const ttsResponseSchema = z.object({
  voiceId: voiceIdSchema.optional(),
});

export type TtsRequest = z.infer<typeof ttsRequestSchema>;
