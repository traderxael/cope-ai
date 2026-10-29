import { describe, expect, it } from 'vitest';
import {
  addDaysDateOnly,
  dateOnlyFromEpochLocal,
  dateOnlyFromParts,
  formatDateOnlyEs,
  isValidDateOnly,
  pickUpcomingDate,
  todayDateOnlyLocal,
} from './date';

describe('isValidDateOnly', () => {
  it('acepta fechas reales en formato ISO corto', () => {
    expect(isValidDateOnly('2026-10-27')).toBe(true);
    expect(isValidDateOnly('2024-02-29')).toBe(true);
  });

  it('rechaza fechas imposibles o mal formadas', () => {
    expect(isValidDateOnly('2024-02-30')).toBe(false);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('2026-00-10')).toBe(false);
    expect(isValidDateOnly('2026-1-5')).toBe(false);
    expect(isValidDateOnly('27/10/2026')).toBe(false);
    expect(isValidDateOnly('')).toBe(false);
  });
});

describe('pickUpcomingDate', () => {
  it('usa la fecha sugerida si es válida y no pasó', () => {
    expect(pickUpcomingDate('2026-12-15', '2026-10-28', 7)).toBe('2026-12-15');
    expect(pickUpcomingDate('2026-10-28', '2026-10-28', 7)).toBe('2026-10-28');
  });

  it('cae al valor por defecto si falta, es inválida o ya pasó', () => {
    expect(pickUpcomingDate(undefined, '2026-10-28', 7)).toBe('2026-11-04');
    expect(pickUpcomingDate('2026-02-30', '2026-10-28', 7)).toBe('2026-11-04');
    expect(pickUpcomingDate('2026-01-01', '2026-10-28', 7)).toBe('2026-11-04');
  });
});

describe('fechas locales sin hora', () => {
  it('usa el día local del timestamp', () => {
    const lateNight = new Date(2026, 0, 5, 23, 45).getTime();
    expect(todayDateOnlyLocal(lateNight)).toBe('2026-01-05');
    expect(dateOnlyFromEpochLocal(lateNight)).toBe('2026-01-05');
  });

  it('arma fechas con ceros a la izquierda', () => {
    expect(dateOnlyFromParts(2026, 1, 5)).toBe('2026-01-05');
  });

  it('suma y resta días cruzando meses, años y bisiestos', () => {
    expect(addDaysDateOnly('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysDateOnly('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysDateOnly('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDaysDateOnly('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysDateOnly('2026-10-27', 0)).toBe('2026-10-27');
  });

  it('devuelve el valor original si no es una fecha válida', () => {
    expect(addDaysDateOnly('texto', 2)).toBe('texto');
  });

  it('formatea en español', () => {
    expect(formatDateOnlyEs('2026-01-05')).toMatch(/5.*ene/i);
    expect(formatDateOnlyEs('2026-12-31')).toMatch(/31.*dic/i);
    expect(formatDateOnlyEs('nope')).toBe('nope');
  });
});
