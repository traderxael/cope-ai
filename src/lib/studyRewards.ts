/**
 * Recompensas de estudio: estrellas acumuladas y desafíos de hoy.
 * Todo se deriva de datos locales; no hay servidor ni sincronización.
 */

import { dateOnlyFromEpochLocal } from '../../shared/date';
import type { LearningActivity } from './learningBadges';

/** Perspectiva mínima de un mazo para contar repasos de hoy. */
export interface ReviewedDeck {
  cards: Array<{ lastReviewedAt?: number }>;
}

/** Cuenta las tarjetas repasadas hoy (no las marcadas en cualquier fecha). */
export function countTodayFlashcardReviews(
  decks: ReviewedDeck[],
  now = Date.now(),
): number {
  const today = dateOnlyFromEpochLocal(now);
  return decks.reduce(
    (total, deck) =>
      total +
      deck.cards.filter(
        (card) =>
          typeof card.lastReviewedAt === 'number' &&
          dateOnlyFromEpochLocal(card.lastReviewedAt) === today,
      ).length,
    0,
  );
}

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

const DUEL_STARS_KEY = 'cope-duel-stars-v1';

/** Estrellas ganadas en duelos, persistidas en el dispositivo. */
export function readDuelStars(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const value = Number(window.localStorage.getItem(DUEL_STARS_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

/** Suma estrellas de un duelo al acumulado local. */
export function addDuelStars(stars: number): void {
  if (!Number.isFinite(stars) || stars <= 0 || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      DUEL_STARS_KEY,
      String(readDuelStars() + Math.floor(stars)),
    );
  } catch {
    // La app sigue funcionando sin storage.
  }
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
