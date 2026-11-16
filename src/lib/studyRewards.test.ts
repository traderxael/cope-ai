import { describe, expect, it } from 'vitest';
import {
  dailyChallenges,
  starsFromActivity,
  type DailyChallengeInput,
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
