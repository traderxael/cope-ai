import { describe, expect, it } from 'vitest';
import {
  FOCUS_DURATIONS,
  formatClock,
  nextPhase,
  phaseDuration,
} from './focus';

describe('focus timer', () => {
  it('usa 25 y 5 minutos por fase', () => {
    expect(phaseDuration('focus')).toBe(1500);
    expect(phaseDuration('break')).toBe(300);
    expect(FOCUS_DURATIONS.focus).toBe(1500);
  });

  it('alterna enfoque y descanso', () => {
    expect(nextPhase('focus')).toBe('break');
    expect(nextPhase('break')).toBe('focus');
  });

  it('formatea el reloj y no baja de cero', () => {
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(299)).toBe('04:59');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-10)).toBe('00:00');
    expect(formatClock(59.2)).toBe('01:00');
  });
});
