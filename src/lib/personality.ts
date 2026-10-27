import { personalityConfigSchema } from '../../shared/schemas/personality';
import {
  DEFAULT_PERSONALITY,
  type PersonalityConfig,
} from '../../shared/types';

export const PERSONALITY_STORAGE_KEY = 'cope-personality-v1';

export function loadPersonality(): PersonalityConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PERSONALITY };
  try {
    const raw = localStorage.getItem(PERSONALITY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PERSONALITY };
    const parsed = personalityConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { ...DEFAULT_PERSONALITY };
  } catch {
    return { ...DEFAULT_PERSONALITY };
  }
}

export function savePersonality(value: PersonalityConfig): PersonalityConfig {
  const parsed = personalityConfigSchema.safeParse(value);
  const next = parsed.success ? parsed.data : { ...DEFAULT_PERSONALITY };
  try {
    localStorage.setItem(PERSONALITY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // El modo privado puede bloquear localStorage; la app sigue con el default.
  }
  return next;
}

export function resetPersonality(): PersonalityConfig {
  try {
    localStorage.removeItem(PERSONALITY_STORAGE_KEY);
  } catch {
    // Sin almacenamiento no hay nada que restablecer.
  }
  return { ...DEFAULT_PERSONALITY };
}
