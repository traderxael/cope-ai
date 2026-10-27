import type {
  Difficulty,
  Level,
  QuizResponse,
  Subject,
} from '../../../shared/types';

export interface PracticeSettings {
  count: 5 | 10;
  difficulty: Difficulty;
  topic?: string;
  timed: boolean;
}

export interface PracticeSession {
  id: string;
  quiz: QuizResponse;
  settings: PracticeSettings;
  subject: Subject;
  level: Level;
  startedAt: number;
}

export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  count: 5,
  difficulty: 'medium',
  timed: false,
};

export function practiceTimeLimitSeconds(settings: PracticeSettings): number {
  return settings.timed ? settings.count * 60 : 0;
}
