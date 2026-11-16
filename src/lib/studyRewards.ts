/**
 * Recompensas de estudio: estrellas acumuladas y desafíos de hoy.
 * Todo se deriva de datos locales; no hay servidor ni sincronización.
 */

import type { LearningActivity } from './learningBadges';

/** Estrellas ganadas según la actividad de estudio acumulada. */
export function starsFromActivity(activity: LearningActivity): number {
  const correct = activity.physicsCorrect + activity.mathCorrect;
  return (
    activity.practiceAttempts * 2 +
    Math.floor(correct / 2) +
    activity.flashcardReviews +
    activity.oralSessions * 10
  );
}

export interface DailyChallengeInput {
  minutes: number;
  questions: number;
  flashcardReviews: number;
}

export interface DailyChallenge {
  id: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

/** Tres metas simples para el día, con su avance real. */
export function dailyChallenges(input: DailyChallengeInput): DailyChallenge[] {
  const defs: Array<Omit<DailyChallenge, 'current' | 'completed'> & { value: number }> = [
    { id: 'minutes', label: 'Estudiar 15 minutos hoy', value: input.minutes, target: 15 },
    { id: 'questions', label: 'Responder 10 preguntas hoy', value: input.questions, target: 10 },
    { id: 'flashcards', label: 'Repasar 5 flashcards hoy', value: input.flashcardReviews, target: 5 },
  ];
  return defs.map(({ value, ...challenge }) => ({
    ...challenge,
    current: Math.max(0, Math.floor(value)),
    completed: value >= challenge.target,
  }));
}
