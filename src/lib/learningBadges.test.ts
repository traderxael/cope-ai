import { describe, expect, it } from 'vitest';
import type { PracticeResult } from './storage';
import type { StudyLog } from './studyLog';
import {
  buildLearningBadges,
  deriveLearningActivity,
  LEARNING_BADGES,
  type LearningActivity,
} from './learningBadges';

const activity = (overrides: Partial<LearningActivity> = {}): LearningActivity => ({
  practiceAttempts: 0,
  physicsCorrect: 0,
  mathCorrect: 0,
  flashcardReviews: 0,
  focusSessions: 0,
  oralSessions: 0,
  conversations: 0,
  ...overrides,
});

describe('insignias-concepto', () => {
  it('define seis conceptos con explicación y aplicación', () => {
    expect(LEARNING_BADGES).toHaveLength(6);
    expect(new Set(LEARNING_BADGES.map((badge) => badge.id)).size).toBe(6);
    for (const badge of LEARNING_BADGES) {
      expect(badge.concept.explanation.length).toBeGreaterThan(40);
      expect(badge.concept.application.length).toBeGreaterThan(20);
    }
  });

  it('desbloquea solo las que tienen su actividad cumplida', () => {
    const badges = buildLearningBadges(
      activity({ focusSessions: 3, physicsCorrect: 5 }),
    );
    expect(badges.filter((badge) => badge.unlocked).map((badge) => badge.id)).toEqual([
      'pomodoro',
      'newton',
    ]);
  });

  it('informa el avance hacia cada concepto', () => {
    const badges = buildLearningBadges(activity({ flashcardReviews: 5 }));
    const spaced = badges.find((badge) => badge.id === 'spaced-repetition')!;
    expect(spaced.current).toBe(5);
    expect(spaced.target).toBe(10);
    expect(spaced.progress).toBeCloseTo(0.5, 5);
    expect(spaced.unlocked).toBe(false);
  });

  it('no desbloquea nada sin actividad', () => {
    expect(buildLearningBadges(activity()).every((badge) => !badge.unlocked)).toBe(true);
  });
});

describe('deriveLearningActivity', () => {
  const result = (subject: string, score: number, questionCount: number): PracticeResult =>
    ({ subject, score, questionCount } as PracticeResult);

  it('deriva aciertos por materia y repasos de las tarjetas', () => {
    const derived = deriveLearningActivity({
      practice: [
        result('physics', 5, 5),
        result('math', 3, 5),
        result('history', 1, 4),
      ],
      flashcardReviews: 12,
      focusSessions: 4,
      oralSessions: 2,
      conversations: 1,
    });
    expect(derived.practiceAttempts).toBe(3);
    expect(derived.physicsCorrect).toBe(5);
    expect(derived.mathCorrect).toBe(3);
    expect(derived.flashcardReviews).toBe(12);
    expect(derived.focusSessions).toBe(4);
    expect(derived.oralSessions).toBe(2);
    expect(derived.conversations).toBe(1);
  });

  it('cuenta los minutos de enfoque como sesiones completadas', () => {
    const log: StudyLog = { '2026-11-15': 50, '2026-11-16': 25 };
    expect(deriveLearningActivity({ studyLog: log }).focusSessions).toBe(3);
  });
});
