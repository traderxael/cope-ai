// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DAILY_GOAL_MINUTES,
  logStreak,
  logStudyMinutes,
  readDailyGoal,
  readStudyLog,
  storeDailyGoal,
  streakFromDates,
  studyMinutesOn,
  studyMinutesToday,
  studyWeek,
} from './studyLog';

function localEpoch(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12, 0, 0).getTime();
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('registro de actividad diaria', () => {
  it('acumula minutos por día', () => {
    const when = localEpoch(2026, 10, 29);
    logStudyMinutes(10, when);
    logStudyMinutes(5, when);
    expect(studyMinutesOn('2026-10-29')).toBe(15);
    expect(studyMinutesToday(when)).toBe(15);
  });

  it('ignora valores inválidos', () => {
    logStudyMinutes(0);
    logStudyMinutes(-4);
    logStudyMinutes(Number.NaN);
    expect(readStudyLog()).toEqual({});
  });

  it('devuelve un registro vacío si el almacenamiento está roto', () => {
    window.localStorage.setItem('cope-study-log-v1', '{no es json');
    expect(readStudyLog()).toEqual({});
  });

  it('descarta entradas con formato inválido', () => {
    window.localStorage.setItem(
      'cope-study-log-v1',
      JSON.stringify({ '2026-10-29': 12, 'ayer': 30, '2026-10-30': 'x' }),
    );
    expect(readStudyLog()).toEqual({ '2026-10-29': 12 });
  });
});

describe('racha a partir de los días activos', () => {
  it('cuenta días consecutivos hasta hoy', () => {
    const now = localEpoch(2026, 10, 29);
    expect(
      streakFromDates(['2026-10-27', '2026-10-28', '2026-10-29'], now),
    ).toBe(3);
  });

  it('mantiene la racha si la última actividad fue ayer', () => {
    const now = localEpoch(2026, 10, 29);
    expect(
      streakFromDates(['2026-10-27', '2026-10-28'], now),
    ).toBe(2);
  });

  it('rompe la racha con dos días sin actividad', () => {
    const now = localEpoch(2026, 10, 29);
    expect(streakFromDates(['2026-10-26', '2026-10-27'], now)).toBe(0);
  });

  it('devuelve cero sin días activos', () => {
    expect(streakFromDates([], Date.now())).toBe(0);
  });

  it('calcula la racha desde el registro local', () => {
    const now = localEpoch(2026, 10, 29);
    logStudyMinutes(5, localEpoch(2026, 10, 28));
    logStudyMinutes(5, localEpoch(2026, 10, 29));
    expect(logStreak(now)).toBe(2);
  });
});

describe('semana de estudio', () => {
  it('devuelve siete días con el último siendo hoy', () => {
    const now = localEpoch(2026, 10, 29);
    const week = studyWeek(now);
    expect(week).toHaveLength(7);
    expect(week[6]?.date).toBe('2026-10-29');
    expect(week[6]?.isToday).toBe(true);
  });

  it('marca los días con minutos registrados', () => {
    const now = localEpoch(2026, 10, 29);
    logStudyMinutes(12, localEpoch(2026, 10, 29));
    const week = studyWeek(now);
    expect(week[6]?.active).toBe(true);
    expect(week[6]?.minutes).toBe(12);
    expect(week[5]?.active).toBe(false);
  });
});

describe('meta diaria configurable', () => {
  it('usa la meta por defecto cuando no hay nada guardado', () => {
    expect(readDailyGoal()).toBe(DAILY_GOAL_MINUTES);
  });

  it('guarda y recupera la meta elegida', () => {
    storeDailyGoal(45);
    expect(readDailyGoal()).toBe(45);
  });

  it('ignora metas inválidas', () => {
    storeDailyGoal(0);
    storeDailyGoal(Number.NaN);
    expect(readDailyGoal()).toBe(DAILY_GOAL_MINUTES);
  });
});
