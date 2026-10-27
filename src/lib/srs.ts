export type ReviewRating = 'again' | 'good' | 'easy';

export interface SrsFields {
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: number;
  lastReviewedAt?: number;
}

const MINUTE = 60_000;
const DAY = 86_400_000;

export function newSrsFields(now = Date.now()): SrsFields {
  return {
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now,
  };
}

export function scheduleReview(
  card: SrsFields,
  rating: ReviewRating,
  now = Date.now(),
): SrsFields {
  if (rating === 'again') {
    return {
      ...card,
      ease: Math.max(1.3, card.ease - 0.2),
      intervalDays: 0,
      repetitions: 0,
      dueAt: now + 10 * MINUTE,
      lastReviewedAt: now,
    };
  }

  if (rating === 'easy') {
    const ease = Math.min(3, card.ease + 0.15);
    const intervalDays = Math.max(
      2,
      Math.round((card.intervalDays || 1) * ease * 1.3),
    );
    return {
      ...card,
      ease,
      intervalDays,
      repetitions: card.repetitions + 1,
      dueAt: now + intervalDays * DAY,
      lastReviewedAt: now,
    };
  }

  const repetitions = card.repetitions + 1;
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.max(1, Math.round((card.intervalDays || 1) * card.ease));
  return {
    ...card,
    repetitions,
    intervalDays,
    dueAt: now + intervalDays * DAY,
    lastReviewedAt: now,
  };
}
