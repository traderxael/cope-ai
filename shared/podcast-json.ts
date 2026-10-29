import { extractJsonObject } from './quiz-json.js';
import { podcastContentSchema, type PodcastContent } from './schemas/podcast.js';

export function parsePodcastJson(raw: string): PodcastContent | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const result = podcastContentSchema.safeParse(json);
  return result.success ? result.data : null;
}
