import { describe, expect, it } from 'vitest';
import {
  buildBadges,
  longestStreak,
  nextBadge,
  STREAK_BADGES,
  unlockedCount,
} from './achievements';

describe('insignias de órbita', () => {
  it('define doce insignias repartidas en tres órbitas', () => {
    expect(STREAK_BADGES).toHaveLength(12);
    expect(new Set(STREAK_BADGES.map((badge) => badge.id)).size).toBe(12);
    expect(new Set(STREAK_BADGES.map((badge) => badge.tier))).toEqual(
      new Set([1, 2, 3]),
    );
  });

  it('desbloquea solo las insignias alcanzadas con la racha', () => {
    const badges = buildBadges(7);
    const unlocked = badges.filter((badge) => badge.unlocked);
    expect(unlocked.map((badge) => badge.id)).toEqual([
      'first-rocket',
      'earth-orbit',
      'lunar-orbit',
    ]);
    expect(unlockedCount(badges)).toBe(3);
  });

  it('informa cuántos días faltan para la próxima insignia', () => {
    const badges = buildBadges(5);
    const next = nextBadge(badges);
    expect(next?.id).toBe('lunar-orbit');
    expect(next?.missing).toBe(2);
    expect(next?.progress).toBeCloseTo(5 / 7, 5);
  });

  it('no deja ninguna insignia pendiente con una racha de un año', () => {
    const badges = buildBadges(365);
    expect(nextBadge(badges)).toBeNull();
    expect(unlockedCount(badges)).toBe(12);
  });

  it('no desbloquea nada sin racha', () => {
    const badges = buildBadges(0);
    expect(unlockedCount(badges)).toBe(0);
    expect(nextBadge(badges)?.id).toBe('first-rocket');
  });

  it('ignora rachas negativas', () => {
    expect(unlockedCount(buildBadges(-5))).toBe(0);
  });
});

describe('racha más larga', () => {
  it('cuenta días consecutivos', () => {
    expect(
      longestStreak([
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-05',
        '2026-10-06',
      ]),
    ).toBe(3);
  });

  it('devuelve cero sin actividad', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('cuenta una racha de un solo día', () => {
    expect(longestStreak(['2026-10-01'])).toBe(1);
  });
});
