/**
 * Insignias estilo órbitas: cada insignia se desbloquea con días
 * consecutivos de estudio. Los nombres replican el estilo de los logros
 * de Astro/Astra (Primer cohete, Órbita terrestre, Órbita lunar…),
 * con arte propio y sin copiar recursos de terceros.
 */

export type BadgeIcon =
  | 'rocket'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'sun'
  | 'asteroid'
  | 'comet'
  | 'nebula'
  | 'galaxy'
  | 'supernova'
  | 'universe';

export type BadgeTier = 1 | 2 | 3;

export interface BadgeDefinition {
  id: string;
  label: string;
  description: string;
  icon: BadgeIcon;
  tier: BadgeTier;
  /** Días de racha necesarios para desbloquearla. */
  requiredStreak: number;
}

export interface Badge extends BadgeDefinition {
  unlocked: boolean;
  /** Avance hacia la insignia, entre 0 y 1. */
  progress: number;
  /** Días que faltan para desbloquearla. */
  missing: number;
}

export const STREAK_BADGES: BadgeDefinition[] = [
  {
    id: 'first-rocket',
    label: 'Primer cohete',
    description: 'Un día de estudio seguido.',
    icon: 'rocket',
    tier: 1,
    requiredStreak: 1,
  },
  {
    id: 'earth-orbit',
    label: 'Órbita terrestre',
    description: 'Tres días seguidos de estudio.',
    icon: 'earth',
    tier: 1,
    requiredStreak: 3,
  },
  {
    id: 'lunar-orbit',
    label: 'Órbita lunar',
    description: 'Una semana entera de estudio.',
    icon: 'moon',
    tier: 1,
    requiredStreak: 7,
  },
  {
    id: 'mars-orbit',
    label: 'Órbita marciana',
    description: 'Dos semanas sin fallar.',
    icon: 'mars',
    tier: 2,
    requiredStreak: 14,
  },
  {
    id: 'jupiter-orbit',
    label: 'Órbita joviana',
    description: 'Un mes de racha activa.',
    icon: 'jupiter',
    tier: 2,
    requiredStreak: 30,
  },
  {
    id: 'solar-orbit',
    label: 'Órbita solar',
    description: 'Dos meses de constancia.',
    icon: 'sun',
    tier: 2,
    requiredStreak: 60,
  },
  {
    id: 'asteroid',
    label: 'Asteroide',
    description: 'Tres meses de racha activa.',
    icon: 'asteroid',
    tier: 3,
    requiredStreak: 90,
  },
  {
    id: 'comet',
    label: 'Cometa',
    description: 'Cuatro meses recorriendo tu órbita.',
    icon: 'comet',
    tier: 3,
    requiredStreak: 120,
  },
  {
    id: 'nebula',
    label: 'Nebulosa',
    description: 'Medio año de estudio ininterrumpido.',
    icon: 'nebula',
    tier: 3,
    requiredStreak: 180,
  },
  {
    id: 'galaxy',
    label: 'Galaxia',
    description: 'Ocho meses de constancia.',
    icon: 'galaxy',
    tier: 3,
    requiredStreak: 240,
  },
  {
    id: 'supernova',
    label: 'Supernova',
    description: 'Diez meses de racha: una estrella en llamas.',
    icon: 'supernova',
    tier: 3,
    requiredStreak: 300,
  },
  {
    id: 'universe',
    label: 'Universo',
    description: 'Un año completo de estudio.',
    icon: 'universe',
    tier: 3,
    requiredStreak: 365,
  },
];

export const BADGE_TIER_LABELS: Record<BadgeTier, string> = {
  1: 'Órbita baja',
  2: 'Órbita media',
  3: 'Órbita alta',
};

/** Construye las insignias con su estado a partir de la racha actual. */
export function buildBadges(streakDays: number): Badge[] {
  const streak = Math.max(0, Math.floor(streakDays));
  return STREAK_BADGES.map((badge) => {
    const progress = Math.min(1, streak / badge.requiredStreak);
    return {
      ...badge,
      unlocked: streak >= badge.requiredStreak,
      progress,
      missing: Math.max(0, badge.requiredStreak - streak),
    };
  });
}

/** Próxima insignia a desbloquear según la racha actual. */
export function nextBadge(badges: Badge[]): Badge | null {
  return badges.find((badge) => !badge.unlocked) ?? null;
}

export function unlockedCount(badges: Badge[]): number {
  return badges.filter((badge) => badge.unlocked).length;
}

/** Racha más larga registrada a partir del historial de días activos. */
export function longestStreak(activeDates: Iterable<string>): number {
  const sorted = [...new Set(activeDates)].sort((a, b) => a.localeCompare(b));
  let best = 0;
  let current = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    if (!previous) {
      current = 1;
    } else {
      const [py, pm, pd] = previous.split('-').map(Number);
      const [cy, cm, cd] = date.split('-').map(Number);
      const previousDay = Date.UTC(py!, pm! - 1, pd!);
      const currentDay = Date.UTC(cy!, cm! - 1, cd!);
      const diffDays = Math.round((currentDay - previousDay) / 86_400_000);
      current = diffDays === 1 ? current + 1 : 1;
    }
    previous = date;
    if (current > best) best = current;
  }
  return best;
}
