import { z } from 'zod';
import { LIMITS } from '../limits.js';
import { levelSchema, subjectSchema } from './common.js';

export const podcastRequestSchema = z.object({
  subject: subjectSchema,
  level: levelSchema,
  topic: z.string().trim().max(LIMITS.maxTopicChars).optional(),
});

export const podcastContentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  script: z.string().trim().min(80).max(LIMITS.maxPodcastChars),
});

export const podcastResponseSchema = podcastContentSchema.extend({
  demo: z.boolean(),
});

export type PodcastRequest = z.infer<typeof podcastRequestSchema>;
export type PodcastContent = z.infer<typeof podcastContentSchema>;
export type PodcastResponse = z.infer<typeof podcastResponseSchema>;
