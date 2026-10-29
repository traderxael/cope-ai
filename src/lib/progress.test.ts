import { describe, expect, it } from 'vitest';
import { addDaysDateOnly, todayDateOnlyLocal } from '../../shared/date';
import { summarizePractice, findWeakAreas, weekActivity } from './progress';
import type { PracticeResult } from './storage';

let counter = 0;

function localNoon(dateOnly: string): number {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year!, month! - 1, day!, 12).getTime();
}

function result(overrides: Partial<PracticeResult> = {}): PracticeResult {
  counter += 1;
  return {
    id: `result-${counter}`,
    subject: 'math',
    level: 'secundaria',
    difficulty: 'medium',
    questionCount: 5,
    timed: false,
    durationSeconds: 300,
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_000_000 + counter,
    score: 4,
    questions: [],
    answers: [],
    ...overrides,
  };
}

describe('summarizePractice', () => {
  it('resume un historial vacío', () => {
    const summary = summarizePractice([], 1_700_000_000_000);
    expect(summary).toMatchObject({
      attempts: 0,
      questions: 0,
      correct: 0,
      accuracy: 0,
      streakDays: 0,
      recent: [],
    });
    expect(summary.bySubject.math).toEqual({
      attempts: 0,
      questions: 0,
      correct: 0,
      accuracy: 0,
    });
  });

  it('calcula precisión global y por materia', () => {
    const summary = summarizePractice([
      result({ subject: 'math', questionCount: 5, score: 4 }),
      result({ subject: 'math', questionCount: 10, score: 7 }),
      result({ subject: 'physics', questionCount: 5, score: 2 }),
    ]);
    expect(summary).toMatchObject({
      attempts: 3,
      questions: 20,
      correct: 13,
    });
    expect(summary.accuracy).toBeCloseTo(0.65);
    expect(summary.bySubject.math).toEqual({
      attempts: 2,
      questions: 15,
      correct: 11,
      accuracy: 11 / 15,
    });
    expect(summary.bySubject.physics.accuracy).toBeCloseTo(0.4);
    expect(summary.bySubject.chemistry.attempts).toBe(0);
  });

  it('detecta materias flojas y las ordena por precisión', () => {
    const summary = summarizePractice([
      result({ subject: 'math', questionCount: 10, score: 9 }),
      result({ subject: 'physics', questionCount: 10, score: 4 }),
      result({ subject: 'chemistry', questionCount: 10, score: 6 }),
      result({ subject: 'biology', questionCount: 10, score: 5 }),
    ]);
    const weak = findWeakAreas(summary);
    expect(weak.map((item) => item.subject)).toEqual([
      'physics',
      'biology',
      'chemistry',
    ]);
    expect(weak[0]?.accuracy).toBeCloseTo(0.4);
    expect(weak[0]?.questions).toBe(10);
    expect(findWeakAreas(summary, 0.5).map((item) => item.subject)).toEqual([
      'physics',
    ]);
    expect(findWeakAreas(summary, 0.7, 2)).toHaveLength(2);
  });

  it('no marca materias sin prácticas', () => {
    const summary = summarizePractice([result({ subject: 'math', score: 5 })]);
    expect(findWeakAreas(summary)).toEqual([]);
    expect(findWeakAreas(summary, 0.9)).toEqual([]);
  });

  it('arma la actividad de los últimos siete días', () => {
    const now = localNoon('2026-10-27');
    const today = todayDateOnlyLocal(now);
    const week = weekActivity(
      [
        result({
          completedAt: localNoon(today),
          questionCount: 10,
        }),
        result({
          completedAt: localNoon(addDaysDateOnly(today, -2)),
          questionCount: 5,
        }),
        result({
          completedAt: localNoon(addDaysDateOnly(today, -8)),
          questionCount: 5,
        }),
      ],
      now,
    );
    expect(week).toHaveLength(7);
    expect(week[6]).toMatchObject({
      date: today,
      active: true,
      questions: 10,
    });
    expect(week[4]).toMatchObject({ active: true, questions: 5 });
    expect(week[0]?.active).toBe(false);
  });

  it('ordena y limita las prácticas recientes', () => {
    const results = Array.from({ length: 10 }, (_, index) =>
      result({ completedAt: 1_700_000_000_000 + index }),
    );
    const summary = summarizePractice(results);
    expect(summary.recent).toHaveLength(8);
    expect(summary.recent[0]?.completedAt).toBe(1_700_000_000_009);
    expect(summary.recent.map((item) => item.completedAt)).toEqual(
      [...summary.recent.map((item) => item.completedAt)].sort(
        (a, b) => b - a,
      ),
    );
  });

  it('cuenta la racha por días locales consecutivos', () => {
    const now = localNoon('2026-10-27');
    const today = todayDateOnlyLocal(now);
    const day = (offset: number) =>
      localNoon(addDaysDateOnly(today, offset));

    const summary = summarizePractice(
      [
        result({ completedAt: day(0) }),
        result({ completedAt: day(-1) }),
        result({ completedAt: day(-1) + 3_600_000 }),
        result({ completedAt: day(-2) }),
        result({ completedAt: day(-4) }),
      ],
      now,
    );
    expect(summary.streakDays).toBe(3);
  });

  it('la racha sigue viva si la última práctica fue ayer', () => {
    const now = localNoon('2026-10-27');
    const today = todayDateOnlyLocal(now);
    const summary = summarizePractice(
      [result({ completedAt: localNoon(addDaysDateOnly(today, -1)) })],
      now,
    );
    expect(summary.streakDays).toBe(1);
  });

  it('la racha se corta si la última práctica fue hace dos días', () => {
    const now = localNoon('2026-10-27');
    const today = todayDateOnlyLocal(now);
    const summary = summarizePractice(
      [result({ completedAt: localNoon(addDaysDateOnly(today, -2)) })],
      now,
    );
    expect(summary.streakDays).toBe(0);
  });
});
