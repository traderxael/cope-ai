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
