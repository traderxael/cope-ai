/**
 * Insignias-concepto: cada una enseña una idea concreta al desbloquearse.
 * Se derivan de la actividad real de estudio, no de la racha, y el arte es
 * propio (PNG 3D generados en scripts/render-badges.py).
 */

export type LearningBadgeIcon =
  | 'spaced-repetition'
  | 'active-recall'
  | 'feynman'
  | 'pomodoro'
  | 'newton'
  | 'pythagoras';

/** Actividad que puede desbloquear una insignia-concepto. */
export interface LearningActivity {
  practiceAttempts: number;
  physicsCorrect: number;
  mathCorrect: number;
  flashcardReviews: number;
  focusSessions: number;
  oralSessions: number;
  conversations: number;
}

interface LearningBadgeDefinition {
  id: string;
  label: string;
  icon: LearningBadgeIcon;
  /** Actividad que se mide para desbloquearla. */
  source: keyof LearningActivity;
  target: number;
  concept: {
    title: string;
    explanation: string;
    application: string;
  };
}

export interface LearningBadge extends LearningBadgeDefinition {
  unlocked: boolean;
  current: number;
  progress: number;
}

/** Datos locales disponibles para derivar la actividad de estudio. */
export interface LearningActivitySources {
  practice?: Array<{ subject: string; score: number }>;
  flashcardReviews?: number;
  focusSessions?: number;
  oralSessions?: number;
  conversations?: number;
  studyLog?: Record<string, number>;
}

/** Deriva la actividad a partir de los datos ya guardados en el dispositivo. */
export function deriveLearningActivity(
  sources: LearningActivitySources,
): LearningActivity {
  const practice = sources.practice ?? [];
  const minutes = Object.values(sources.studyLog ?? {}).reduce(
    (total, value) => total + (Number.isFinite(value) ? value : 0),
    0,
  );
  return {
    practiceAttempts: practice.length,
    physicsCorrect: practice
      .filter((result) => result.subject === 'physics')
      .reduce((total, result) => total + result.score, 0),
    mathCorrect: practice
      .filter((result) => result.subject === 'math')
      .reduce((total, result) => total + result.score, 0),
    flashcardReviews: sources.flashcardReviews ?? 0,
    focusSessions:
      sources.focusSessions ?? Math.floor(minutes / 25),
    oralSessions: sources.oralSessions ?? 0,
    conversations: sources.conversations ?? 0,
  };
}

export const LEARNING_BADGES: LearningBadgeDefinition[] = [
  {
    id: 'spaced-repetition',
    label: 'Repetición espaciada',
    icon: 'spaced-repetition',
    source: 'flashcardReviews',
    target: 10,
    concept: {
      title: 'Repetir justo a tiempo',
      explanation:
        'Repasar un dato cuando estás por olvidarlo obliga al cerebro a recuperarlo y hace que la memoria dure mucho más que repetirlo una y otra vez seguido. El olvido parcial es parte del aprendizaje.',
      application:
        'Cope ya lo aplica: las flashcards que respondés bien vuelven más tarde y las que fallás, antes.',
    },
  },
  {
    id: 'active-recall',
    label: 'Recuperación activa',
    icon: 'active-recall',
    source: 'practiceAttempts',
    target: 5,
    concept: {
      title: 'Recordar no es releer',
      explanation:
        'Cerrar el material y tratar de recordar la respuesta sin ayuda es más efectivo que releer el apunte. El esfuerzo de recuperar la información es lo que la fija en la memoria.',
      application:
        'Antes de mirar la explicación de una práctica, probá decir la respuesta en voz alta.',
    },
  },
  {
    id: 'feynman',
    label: 'Técnica Feynman',
    icon: 'feynman',
    source: 'oralSessions',
    target: 2,
    concept: {
      title: 'Explicalo simple',
      explanation:
        'Explicar un tema con palabras cotidianas, como si se lo enseñaras a alguien que no sabe, revela los huecos que la memorización esconde. Si no podés simplificarlo, todavía no lo entendés del todo.',
      application:
        'Usá el examen oral: respondé sin tecnicismos y fíjate qué parte no podés explicar con calma.',
    },
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    icon: 'pomodoro',
    source: 'focusSessions',
    target: 3,
    concept: {
      title: 'Bloques cortos, pausas reales',
      explanation:
        'Trabajar en bloques breves y enfocados, con pausas regulares, mantiene la atención y evita la fatiga mental. La pausa no es tiempo perdido: es cuando el cerebro consolida lo estudiado.',
      application:
        '25 minutos de estudio y 5 de descanso. Cope suma esos bloques a tu meta diaria.',
    },
  },
  {
    id: 'newton',
    label: 'Segunda ley de Newton',
    icon: 'newton',
    source: 'physicsCorrect',
    target: 5,
    concept: {
      title: 'Fuerza, masa y aceleración',
      explanation:
        'La fuerza neta sobre un cuerpo es igual a su masa por la aceleración: F = m·a. Si la masa no cambia, duplicar la fuerza duplica la aceleración; si la masa se duplica, la aceleración se reduce a la mitad.',
      application:
        'En un problema de física, dibujá primero todas las fuerzas y sumalas con signo antes de aplicar F = m·a.',
    },
  },
  {
    id: 'pythagoras',
    label: 'Teorema de Pitágoras',
    icon: 'pythagoras',
    source: 'mathCorrect',
    target: 5,
    concept: {
      title: 'El triángulo rectángulo',
      explanation:
        'En un triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos: a² + b² = c². Solo vale cuando hay un ángulo de 90°.',
      application:
        'Sirve para distancias y componentes: descomponé un vector en dos ejes perpendiculares y usalo para hallar su magnitud.',
    },
  },
];

/** Construye las insignias-concepto con su estado a partir de la actividad. */
export function buildLearningBadges(activity: LearningActivity): LearningBadge[] {
  return LEARNING_BADGES.map((badge) => {
    const raw = Math.max(0, Math.floor(activity[badge.source] ?? 0));
    const current = Math.min(raw, badge.target);
    return {
      ...badge,
      current,
      unlocked: raw >= badge.target,
      progress: badge.target > 0 ? current / badge.target : 0,
    };
  });
}
