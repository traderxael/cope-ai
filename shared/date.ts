const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function dateOnlyFromParts(
  year: number,
  month: number,
  day: number,
): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayDateOnlyLocal(now = Date.now()): string {
  const date = new Date(now);
  return dateOnlyFromParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

export function dateOnlyFromEpochLocal(epoch: number): string {
  return todayDateOnlyLocal(epoch);
}

export function pickUpcomingDate(
  suggested: string | undefined,
  today: string,
  fallbackDays: number,
): string {
  return suggested && isValidDateOnly(suggested) && suggested >= today
    ? suggested
    : addDaysDateOnly(today, fallbackDays);
}

export function addDaysDateOnly(value: string, days: number): string {
  const match = DATE_ONLY.exec(value);
  if (!match) return value;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );
  return dateOnlyFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function formatDateOnlyEs(value: string): string {
  const match = DATE_ONLY.exec(value);
  if (!match) return value;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
