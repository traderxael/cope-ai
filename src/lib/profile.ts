import { LEVELS, SUBJECTS } from '../../shared/schemas/common';
import type { Level, Subject } from '../../shared/types';

export type LearningGoal = 'exam' | 'grades' | 'practice';

const LEARNING_GOALS: LearningGoal[] = ['exam', 'grades', 'practice'];

export const LEARNING_GOAL_LABELS: Record<LearningGoal, string> = {
  exam: 'Preparar un examen',
  grades: 'Mejorar mis notas',
  practice: 'Practicar bajo presión',
};

export interface UserProfile {
  name: string;
  level: Level;
  subjects: Subject[];
  examDate?: string;
  goal?: LearningGoal;
  createdAt: number;
}

export const PROFILE_STORAGE_KEY = 'cope-profile-v1';

function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && LEVELS.includes(value as Level);
}

function isSubject(value: unknown): value is Subject {
  return typeof value === 'string' && SUBJECTS.includes(value as Subject);
}

function isGoal(value: unknown): value is LearningGoal {
  return (
    typeof value === 'string' &&
    LEARNING_GOALS.includes(value as LearningGoal)
  );
}

export function loadProfile(): UserProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const subjects = Array.isArray(parsed.subjects)
      ? parsed.subjects.filter(isSubject)
      : [];
    if (!name || !isLevel(parsed.level) || subjects.length === 0) return null;
    return {
      name: name.slice(0, 40),
      level: parsed.level,
      subjects: [...new Set(subjects)],
      ...(typeof parsed.examDate === 'string' && parsed.examDate
        ? { examDate: parsed.examDate }
        : {}),
      ...(isGoal(parsed.goal) ? { goal: parsed.goal } : {}),
      createdAt:
        typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): UserProfile {
  const next: UserProfile = {
    ...profile,
    name: profile.name.trim().slice(0, 40),
    subjects: [...new Set(profile.subjects)].slice(0, 14),
  };
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // La app sigue funcionando aunque el almacenamiento esté bloqueado.
  }
  return next;
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Sin almacenamiento no hay perfil que borrar.
  }
}
