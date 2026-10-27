import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRACTICE_SETTINGS,
  practiceTimeLimitSeconds,
} from './practice';

describe('practice settings', () => {
  it('usa cinco preguntas sin tiempo por defecto', () => {
    expect(DEFAULT_PRACTICE_SETTINGS).toEqual({
      count: 5,
      difficulty: 'medium',
      timed: false,
    });
  });

  it('calcula un minuto por pregunta solo en modo con tiempo', () => {
    expect(
      practiceTimeLimitSeconds({ ...DEFAULT_PRACTICE_SETTINGS, timed: false }),
    ).toBe(0);
    expect(
      practiceTimeLimitSeconds({
        ...DEFAULT_PRACTICE_SETTINGS,
        count: 5,
        timed: true,
      }),
    ).toBe(300);
    expect(
      practiceTimeLimitSeconds({
        ...DEFAULT_PRACTICE_SETTINGS,
        count: 10,
        timed: true,
      }),
    ).toBe(600);
  });
});
