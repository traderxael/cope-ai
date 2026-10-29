import { SUBJECTS } from '../../shared/schemas/common';
import {
  addDaysDateOnly,
  dateOnlyFromEpochLocal,
} from '../../shared/date';
import type { Subject } from '../../shared/types';
import type { PracticeResult } from './storage';

export interface SubjectProgress {
  attempts: number;
  questions: number;
  correct: number;
  accuracy: number;
}

export interface ProgressSummary {
  attempts: number;
  questions: number;
  correct: number;
  accuracy: number;
  streakDays: number;
  bySubject: Record<Subject, SubjectProgress>;
  recent: PracticeResult[];
}

function subjectProgress(
  results: PracticeResult[],
  subject: Subject,
): SubjectProgress {
  const matches = results.filter((result) => result.subject === subject);
  const questions = matches.reduce(
    (total, result) => total + result.questionCount,
    0,
  );
  const correct = matches.reduce((total, result) => total + result.score, 0);
  return {
    attempts: matches.length,
    questions,
    correct,
    accuracy: questions > 0 ? correct / questions : 0,
  };
}

function calculateStreak(results: PracticeResult[], now: number): number {
  const days = [
    ...new Set(
      results.map((result) => dateOnlyFromEpochLocal(result.completedAt)),
    ),
  ].sort((a, b) => b.localeCompare(a));

  if (days.length === 0) return 0;
  const today = dateOnlyFromEpochLocal(now);
  const yesterday = addDaysDateOnly(today, -1);
  const latest = days[0];
  if (!latest || (latest !== today && latest !== yesterday)) return 0;

  let streak = 0;
  let expected = latest;
  for (const day of days) {
    if (day > expected) continue;
    if (day !== expected) break;
    streak += 1;
    expected = addDaysDateOnly(expected, -1);
  }
  return streak;
}

export interface WeakArea {
  subject: Subject;
  accuracy: number;
  questions: number;
}

export interface WeekActivityDay {
  date: string;
  label: string;
  active: boolean;
  questions: number;
}

const WEEKDAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function weekdayLabel(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const weekday = new Date(year!, month! - 1, day!).getDay();
  return WEEKDAY_LABELS[weekday] ?? '';
}

export function weekActivity(
  results: PracticeResult[],
  now = Date.now(),
): WeekActivityDay[] {
  const today = dateOnlyFromEpochLocal(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysDateOnly(today, index - 6);
    const questions = results
      .filter((result) => dateOnlyFromEpochLocal(result.completedAt) === date)
      .reduce((total, result) => total + result.questionCount, 0);
    return {
      date,
      label: weekdayLabel(date),
      active: questions > 0,
      questions,
    };
  });
}

export const PREPARATION_TARGET = 85;

export function preparationLevel(summary: ProgressSummary): number {
  if (summary.questions === 0) return 0;
  const confidence = 0.5 + 0.5 * Math.min(1, summary.questions / 40);
  return Math.min(100, Math.round(summary.accuracy * 100 * confidence));
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
}

export function achievements(summary: ProgressSummary): Achievement[] {
  return [
    {
      id: 'first',
      label: 'Primer paso',
      description: 'Completá tu primera práctica.',
      unlocked: summary.attempts >= 1,
    },
    {
      id: 'streak3',
      label: 'Racha de 3',
      description: 'Practicá tres días seguidos.',
      unlocked: summary.streakDays >= 3,
    },
    {
      id: 'ten',
      label: 'Constancia',
      description: 'Completá diez prácticas.',
      unlocked: summary.attempts >= 10,
    },
    {
      id: 'sharp',
      label: 'Puntería',
      description: 'Alcanzá 80% con veinte preguntas o más.',
      unlocked: summary.questions >= 20 && summary.accuracy >= 0.8,
    },
  ];
}

export function findWeakAreas(
  summary: ProgressSummary,
  threshold = 0.7,
  limit = 4,
): WeakArea[] {
  return SUBJECTS.map((subject) => ({ subject, ...summary.bySubject[subject] }))
    .filter((item) => item.attempts > 0 && item.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit)
    .map(({ subject, accuracy, questions }) => ({
      subject,
      accuracy,
      questions,
    }));
}

export function summarizePractice(
  results: PracticeResult[],
  now = Date.now(),
): ProgressSummary {
  const questions = results.reduce(
    (total, result) => total + result.questionCount,
    0,
  );
  const correct = results.reduce((total, result) => total + result.score, 0);
  const bySubject = Object.fromEntries(
    SUBJECTS.map((subject) => [subject, subjectProgress(results, subject)]),
  ) as Record<Subject, SubjectProgress>;
  const recent = [...results]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 8);

  return {
    attempts: results.length,
    questions,
    correct,
    accuracy: questions > 0 ? correct / questions : 0,
    streakDays: calculateStreak(results, now),
    bySubject,
    recent,
  };
}
