// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  addDuelStars,
  countTodayFlashcardReviews,
  dailyChallenges,
  readDuelStars,
  starsFromActivity,
  type DailyChallengeInput,
  type ReviewedDeck,
} from './studyRewards';

describe('estrellas', () => {
  it('suma estrellas por prácticas, aciertos y exámenes orales', () => {
    expect(
      starsFromActivity({
        practiceAttempts: 3,
        physicsCorrect: 6,
        mathCorrect: 4,
        flashcardReviews: 12,
        focusSessions: 2,
        oralSessions: 1,
        conversations: 0,
      }),
    ).toBe(3 * 2 + 10 / 2 + 12 + 1 * 10);
  });

  it('devuelve cero sin actividad', () => {
    expect(
      starsFromActivity({
        practiceAttempts: 0,
        physicsCorrect: 0,
        mathCorrect: 0,
        flashcardReviews: 0,
        focusSessions: 0,
        oralSessions: 0,
        conversations: 0,
      }),
    ).toBe(0);
  });
});

describe('desafíos diarios', () => {
  const input = (overrides: Partial<DailyChallengeInput> = {}): DailyChallengeInput => ({
    minutes: 0,
    questions: 0,
    flashcardReviews: 0,
    ...overrides,
  });

  it('propone tres desafíos y marca los completados', () => {
    const challenges = dailyChallenges(input({ minutes: 20, questions: 12, flashcardReviews: 3 }));
    expect(challenges).toHaveLength(3);
    expect(challenges.map((challenge) => challenge.completed)).toEqual([true, true, false]);
    expect(challenges[2]!.current).toBe(3);
    expect(challenges[2]!.target).toBe(5);
  });

  it('no marca ninguno sin actividad', () => {
    expect(dailyChallenges(input()).every((challenge) => !challenge.completed)).toBe(true);
  });
});

describe('estrellas de duelo', () => {
  it('acumula estrellas entre duelos', () => {
    window.localStorage.clear();
    expect(readDuelStars()).toBe(0);
    addDuelStars(3);
    addDuelStars(1);
    expect(readDuelStars()).toBe(4);
    window.localStorage.clear();
  });

  it('ignora valores inválidos', () => {
    window.localStorage.clear();
    addDuelStars(-5);
    addDuelStars(Number.NaN);
    expect(readDuelStars()).toBe(0);
  });
});

describe('countTodayFlashcardReviews', () => {
  const now = new Date(2026, 10, 16, 12, 0, 0).getTime();
  const deck = (lastReviewedAt?: number): ReviewedDeck => ({
    cards: [{ lastReviewedAt }],
  });

  it('cuenta solo las tarjetas repasadas hoy', () => {
    expect(
      countTodayFlashcardReviews(
        [deck(now - 3_600_000), deck(now - 3 * 86_400_000), deck(undefined)],
        now,
      ),
    ).toBe(1);
  });

  it('devuelve cero sin mazos', () => {
    expect(countTodayFlashcardReviews([], now)).toBe(0);
  });
});
