import { describe, expect, it } from 'vitest';
import { suggestedExamFormat } from '../../../shared/exams';
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
      examFormat: 'general',
    });
  });

  it('sugiere el formato de examen según el país', () => {
    expect(suggestedExamFormat('cl')).toBe('paes');
    expect(suggestedExamFormat('es')).toBe('selectividad');
    expect(suggestedExamFormat('co')).toBe('icfes');
    expect(suggestedExamFormat('mx')).toBe('admision');
    expect(suggestedExamFormat('ar')).toBe('general');
    expect(suggestedExamFormat(undefined)).toBe('general');
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
