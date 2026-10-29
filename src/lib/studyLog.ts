import {
  addDaysDateOnly,
  dateOnlyFromEpochLocal,
  todayDateOnlyLocal,
} from '../../shared/date';

const STORAGE_KEY = 'cope-study-log-v1';

/** Meta diaria de estudio, en minutos (30 min por defecto). */
export const DAILY_GOAL_MINUTES = 30;

export const DAILY_GOAL_OPTIONS = [15, 30, 45, 60, 90];

const GOAL_KEY = 'cope-study-goal';

export interface StudyLog {
  [date: string]: number;
}

export interface StudyDay {
  date: string;
  label: string;
  minutes: number;
  active: boolean;
  isToday: boolean;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_LABELS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * Lee el registro local de minutos de estudio por día.
 * Si el almacenamiento no está disponible devuelve un registro vacío.
 */
export function readStudyLog(): StudyLog {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const log: StudyLog = {};
    for (const [date, minutes] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!DATE_ONLY.test(date)) continue;
      if (typeof minutes !== 'number' || !Number.isFinite(minutes)) continue;
      if (minutes <= 0) continue;
      log[date] = Math.round(minutes * 100) / 100;
    }
    return log;
  } catch {
    return {};
  }
}

/** Suma minutos de estudio al día correspondiente. */
export function logStudyMinutes(minutes: number, when = Date.now()): void {
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  if (typeof window === 'undefined') return;
  const date = dateOnlyFromEpochLocal(when);
  const log = readStudyLog();
  const next = Math.min(600, Math.round(((log[date] ?? 0) + minutes) * 100) / 100);
  log[date] = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // La app sigue funcionando aunque el almacenamiento esté bloqueado.
  }
}

export function studyMinutesOn(
  date: string,
  log: StudyLog = readStudyLog(),
): number {
  const value = log[date];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function studyMinutesToday(
  now = Date.now(),
  log: StudyLog = readStudyLog(),
): number {
  return studyMinutesOn(todayDateOnlyLocal(now), log);
}

/** Días de la última semana (hoy incluido) con los minutos de cada día. */
export function studyWeek(
  now = Date.now(),
  log: StudyLog = readStudyLog(),
): StudyDay[] {
  const today = todayDateOnlyLocal(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysDateOnly(today, index - 6);
    const minutes = studyMinutesOn(date, log);
    const [year, month, day] = date.split('-').map(Number);
    const weekday = new Date(
      Date.UTC(year!, month! - 1, day!),
    ).getUTCDay();
    return {
      date,
      label: WEEKDAY_LABELS[weekday] ?? '',
      minutes,
      active: minutes > 0,
      isToday: date === today,
    };
  });
}

/**
 * Racha de días consecutivos con actividad.
 * La racha sigue viva si la última actividad fue hoy o ayer.
 */
export function streakFromDates(
  dates: Iterable<string>,
  now = Date.now(),
): number {
  const unique = new Set<string>();
  for (const date of dates) {
    if (DATE_ONLY.test(date)) unique.add(date);
  }
  if (unique.size === 0) return 0;

  const today = todayDateOnlyLocal(now);
  const yesterday = addDaysDateOnly(today, -1);
  const sorted = [...unique].sort((a, b) => b.localeCompare(a));
  const latest = sorted[0];
  if (!latest || (latest !== today && latest !== yesterday)) return 0;

  let streak = 0;
  let expected = latest;
  for (const day of sorted) {
    if (day > expected) continue;
    if (day !== expected) break;
    streak += 1;
    expected = addDaysDateOnly(expected, -1);
  }
  return streak;
}

/** Racha calculada sobre el registro local de estudio. */
export function logStreak(now = Date.now(), log: StudyLog = readStudyLog()): number {
  return streakFromDates(
    Object.keys(log).filter((date) => studyMinutesOn(date, log) > 0),
    now,
  );
}

/** Meta diaria configurada por la persona, con el valor por defecto como respaldo. */
export function readDailyGoal(): number {
  if (typeof window === 'undefined') return DAILY_GOAL_MINUTES;
  try {
    const raw = window.localStorage.getItem(GOAL_KEY);
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return DAILY_GOAL_MINUTES;
    return Math.round(value);
  } catch {
    return DAILY_GOAL_MINUTES;
  }
}

export function storeDailyGoal(minutes: number): void {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  try {
    window.localStorage.setItem(GOAL_KEY, String(Math.round(minutes)));
  } catch {
    // La meta sigue funcionando en memoria si el almacenamiento está bloqueado.
  }
}
