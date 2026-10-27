import { describe, expect, it } from 'vitest';
import { newSrsFields, scheduleReview } from './srs';

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const DAY = 86_400_000;

describe('newSrsFields', () => {
  it('programa la tarjeta para el momento de creación', () => {
    expect(newSrsFields(NOW)).toEqual({
      ease: 2.5,
      intervalDays: 0,
      repetitions: 0,
      dueAt: NOW,
    });
  });
});

describe('scheduleReview', () => {
  it('"Otra vez" reinicia el intervalo y baja el ease', () => {
    const reviewed = scheduleReview(
      { ease: 2.5, intervalDays: 8, repetitions: 4, dueAt: NOW },
      'again',
      NOW,
    );
    expect(reviewed).toMatchObject({
      ease: 2.3,
      intervalDays: 0,
      repetitions: 0,
      dueAt: NOW + 10 * MINUTE,
      lastReviewedAt: NOW,
    });
  });

  it('no baja el ease de 1.3', () => {
    const reviewed = scheduleReview(
      { ease: 1.3, intervalDays: 0, repetitions: 0, dueAt: NOW },
      'again',
      NOW,
    );
    expect(reviewed.ease).toBe(1.3);
  });

  it('"Bien" progresa 1 día, 3 días y luego usa el ease', () => {
    let card = newSrsFields(NOW);
    card = scheduleReview(card, 'good', NOW);
    expect(card).toMatchObject({ repetitions: 1, intervalDays: 1 });
    expect(card.dueAt).toBe(NOW + DAY);

    card = scheduleReview(card, 'good', NOW);
    expect(card).toMatchObject({ repetitions: 2, intervalDays: 3 });
    expect(card.dueAt).toBe(NOW + 3 * DAY);

    card = scheduleReview(card, 'good', NOW);
    expect(card).toMatchObject({ repetitions: 3, intervalDays: 8 });
    expect(card.dueAt).toBe(NOW + 8 * DAY);
  });

  it('"Fácil" sube el ease y programa al menos dos días', () => {
    const reviewed = scheduleReview(newSrsFields(NOW), 'easy', NOW);
    expect(reviewed.ease).toBeCloseTo(2.65);
    expect(reviewed.intervalDays).toBeGreaterThanOrEqual(2);
    expect(reviewed.repetitions).toBe(1);
    expect(reviewed.dueAt).toBe(NOW + reviewed.intervalDays * DAY);
  });

  it('limita el ease a 3', () => {
    const reviewed = scheduleReview(
      { ease: 2.95, intervalDays: 4, repetitions: 3, dueAt: NOW },
      'easy',
      NOW,
    );
    expect(reviewed.ease).toBe(3);
  });
});
