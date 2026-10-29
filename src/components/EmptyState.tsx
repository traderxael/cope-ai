import {
  LEVEL_LABELS,
  SUBJECT_LABELS,
  type Mode,
  type StudyStyle,
  type Subject,
  type TutorConfig,
} from '../../shared/types';
import type { LearningGoal } from '../lib/profile';
import { Icon, type IconName } from './Icon';

interface Suggestion {
  title: string;
  description: string;
  prompt: string;
  icon: IconName;
}

const ASSISTANT_SUGGESTIONS: Suggestion[] = [
  {
    title: 'Ordenar una idea',
    description: 'De una intuición a un plan de tres pasos.',
    prompt:
      'Ayudame a convertir una idea suelta en un plan concreto de tres pasos. Hacéme las preguntas necesarias para definirla y proponé el plan.',
    icon: 'sparkles',
  },
  {
    title: 'Explicar con una analogía',
    description: 'Un concepto difícil, en palabras simples.',
    prompt:
      'Explícame un concepto complejo con una analogía cotidiana. Elegí un concepto útil para estudiar y justificá por qué la analogía funciona.',
    icon: 'book',
  },
  {
    title: 'Escribir un email',
    description: 'Claro, breve y con el tono justo.',
    prompt:
      'Escribí un email breve y claro para pedir una prórroga en un trabajo. Proponé un nuevo plazo razonable.',
    icon: 'pencil',
  },
  {
    title: 'Comparar opciones',
    description: 'Una tabla para decidir sin ruido.',
    prompt:
      'Compará estudiar en grupo con estudiar solo en una tabla de ventajas, desventajas y cuándo conviene cada opción.',
    icon: 'monitor',
  },
];

const TUTOR_SUGGESTIONS: Partial<Record<Subject, Suggestion[]>> = {
  math: [
    {
      title: 'Derivadas sin miedo',
      description: 'Qué son y para qué sirven, con un ejemplo.',
      prompt:
        'Explícame qué es una derivada con un ejemplo cotidiano y resolvamos uno paso a paso.',
      icon: 'calculator',
    },
    {
      title: 'Ecuaciones de primer grado',
      description: 'Practiquemos con un ejercicio guiado.',
      prompt:
        'Ayúdame a practicar ecuaciones de primer grado con un ejercicio guiado y una comprobación final.',
      icon: 'book',
    },
    {
      title: 'Geometría con dibujos',
      description: 'Áreas y perímetros, sin memorizar de más.',
      prompt:
        'Explícame cómo calcular el área de un triángulo y déjame un ejercicio para comprobar si entendí.',
      icon: 'sparkles',
    },
  ],
  physics: [
    {
      title: 'La segunda ley de Newton',
      description: 'Fuerza, masa y aceleración en contexto.',
      prompt:
        'Explícame la segunda ley de Newton con un ejemplo y resolvamos un ejercicio juntos.',
      icon: 'atom',
    },
    {
      title: 'Cinemática paso a paso',
      description: 'Velocidad, aceleración y distancia.',
      prompt:
        'Ayúdame a entender velocidad, aceleración y distancia con un problema guiado.',
      icon: 'calculator',
    },
    {
      title: 'Energía y trabajo',
      description: 'Cinética, potencial y conservación.',
      prompt:
        'Explícame la diferencia entre energía cinética y potencial con un ejemplo y una comprobación.',
      icon: 'sparkles',
    },
  ],
  chemistry: [
    {
      title: 'Balancear ecuaciones',
      description: 'Un método para no perder la cuenta.',
      prompt:
        'Enséñame a balancear una ecuación química paso a paso con un ejemplo.',
      icon: 'flask',
    },
    {
      title: 'Moles y masa molar',
      description: 'La cuenta que conecta átomos y gramos.',
      prompt:
        'Explícame qué es un mol y cómo calcular la masa molar con un ejercicio.',
      icon: 'calculator',
    },
    {
      title: 'Ácidos y bases',
      description: 'Qué mide el pH y cómo interpretarlo.',
      prompt:
        'Explícame el pH y cómo identificar si una solución es ácida o básica con ejemplos.',
      icon: 'sparkles',
    },
  ],
  general: [
    {
      title: 'Preparar un examen',
      description: 'Un plan realista para la semana.',
      prompt:
        'Ayúdame a armar un plan de estudio para un examen en una semana, con bloques y repasos.',
      icon: 'book',
    },
    {
      title: 'Mejorar mis apuntes',
      description: 'Resumir sin copiar todo.',
      prompt:
        'Dame una técnica para resumir y organizar mis apuntes de forma efectiva.',
      icon: 'pencil',
    },
    {
      title: 'Entender un texto',
      description: 'Ideas principales y argumentos.',
      prompt:
        'Explícame cómo identificar la idea principal y los argumentos de un texto.',
      icon: 'sparkles',
    },
  ],
};

interface EmptyStateProps {
  mode: Mode;
  tutor: TutorConfig;
  onSuggestion: (prompt: string) => void;
  onPractice: () => void;
  onStyleChange: (style: StudyStyle) => void;
  onOpenPlan: () => void;
  onOpenOralExam: () => void;
  onOpenPodcast: () => void;
  onSimulacro: () => void;
  practiceLoading: boolean;
  disabled: boolean;
  vision?: boolean | null;
  userName?: string;
  goal?: LearningGoal;
}

const GOAL_COPY: Record<
  LearningGoal,
  { label: string; action: string }
> = {
  exam: { label: 'Preparar un examen', action: 'Abrir plan' },
  grades: { label: 'Mejorar mis notas', action: 'Generar práctica' },
  practice: { label: 'Practicar bajo presión', action: 'Abrir simulacro' },
};

export function EmptyState({
  mode,
  tutor,
  onSuggestion,
  onPractice,
  onStyleChange,
  onOpenPlan,
  onOpenOralExam,
  onOpenPodcast,
  onSimulacro,
  practiceLoading,
  disabled,
  vision = true,
  userName,
  goal,
}: EmptyStateProps) {
  const suggestions =
    mode === 'tutor'
      ? (TUTOR_SUGGESTIONS[tutor.subject] ?? TUTOR_SUGGESTIONS.general ?? [])
      : ASSISTANT_SUGGESTIONS;
  const kicker =
    mode === 'tutor'
      ? `${SUBJECT_LABELS[tutor.subject]} · ${LEVEL_LABELS[tutor.level]}`
      : 'Asistente';
  const greeting = userName?.trim() ? `Hola, ${userName.trim()}. ` : '';

  return (
    <div className="emptyState">
      <div className="emptyOrnament" aria-hidden="true">
        <span className="orbit orbitOne" />
        <span className="orbit orbitTwo" />
        <span className="orbitCore">C</span>
      </div>

      <p className="eyebrow">{kicker}</p>
      <h1 className="emptyTitle">
        {mode === 'tutor'
          ? 'Aprender paso a paso, sin atajos.'
          : 'Pensemos esto con calma.'}
      </h1>
      <p className="emptyLead">
        {mode === 'tutor'
          ? `${greeting}Resolvamos juntos: Cope te guía con preguntas, ejemplos y práctica. Elegí una materia en el panel y empezá cuando quieras.`
          : vision === false
            ? `${greeting}Preguntá, redactá o convertí una idea en un plan. También podés adjuntar un PDF, TXT o PPTX para trabajar sobre tu material; la IA actual no analiza imágenes.`
            : `${greeting}Preguntá, redactá o convertí una idea en un plan. También podés adjuntar una imagen, un PDF, TXT o PPTX para trabajar sobre tu material.`}
      </p>

      {mode === 'tutor' && goal ? (
        <div className="goalBanner">
          <span>
            <span className="goalBannerLabel">Tu objetivo</span>
            <strong>{GOAL_COPY[goal].label}</strong>
          </span>
          <button
            type="button"
            className="button ghost small"
            onClick={
              goal === 'exam'
                ? onOpenPlan
                : goal === 'grades'
                  ? onPractice
                  : onSimulacro
            }
            disabled={disabled}
          >
            {GOAL_COPY[goal].action}
          </button>
        </div>
      ) : null}

      <div className="suggestionGrid">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.title}
            type="button"
            className="suggestionCard"
            onClick={() => onSuggestion(suggestion.prompt)}
            disabled={disabled}
          >
            <span className="suggestionIcon">
              <Icon name={suggestion.icon} size={19} />
            </span>
            <span className="suggestionText">
              <strong>{suggestion.title}</strong>
              <span>{suggestion.description}</span>
            </span>
            <Icon name="arrowUp" size={16} className="suggestionArrow" />
          </button>
        ))}
      </div>

      {mode === 'tutor' ? (
        <>
          <div className="modeGrid" aria-label="Modos de estudio">
            <button
              type="button"
              className="modeCard"
              onClick={() => onStyleChange('guided')}
              disabled={disabled}
            >
              <Icon name="graduation" size={19} />
              <span>
                <strong>Socrático</strong>
                <small>Pistas y preguntas para resolver vos.</small>
              </span>
            </button>
            <button
              type="button"
              className="modeCard"
              onClick={() => onStyleChange('solver')}
              disabled={disabled}
            >
              <Icon name="target" size={19} />
              <span>
                <strong>Solver</strong>
                <small>Resolución completa, paso a paso.</small>
              </span>
            </button>
            <button
              type="button"
              className="modeCard"
              onClick={onOpenPlan}
              disabled={disabled}
            >
              <Icon name="calendar" size={19} />
              <span>
                <strong>Exam Prep</strong>
                <small>Plan por días hasta el examen.</small>
              </span>
            </button>
            <button
              type="button"
              className="modeCard"
              onClick={onOpenOralExam}
              disabled={disabled}
            >
              <Icon name="mic" size={19} />
              <span>
                <strong>Examen oral</strong>
                <small>Preguntas y corrección con voz.</small>
              </span>
            </button>
            <button
              type="button"
              className="modeCard"
              onClick={onOpenPodcast}
              disabled={disabled}
            >
              <Icon name="volume" size={19} />
              <span>
                <strong>Podcast</strong>
                <small>Un repaso para escuchar.</small>
              </span>
            </button>
            <button
              type="button"
              className="modeCard"
              onClick={onSimulacro}
              disabled={disabled}
            >
              <Icon name="timer" size={19} />
              <span>
                <strong>Simulacro</strong>
                <small>10 preguntas con tiempo.</small>
              </span>
            </button>
          </div>

          <div className="practiceCallout">
          <div className="practiceCalloutCopy">
            <span className="practiceKicker">Práctica · 5 preguntas</span>
            <strong>Comprobá lo que sabés</strong>
            <p>
              Una práctica corta de {SUBJECT_LABELS[tutor.subject].toLowerCase()}{' '}
              para {LEVEL_LABELS[tutor.level].toLowerCase()}, con explicaciones
              después de cada respuesta.
            </p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={onPractice}
            disabled={disabled || practiceLoading}
          >
            {practiceLoading ? (
              <>
                <span className="spinner small" aria-hidden="true" />
                Generando…
              </>
            ) : (
              <>
                <Icon name="sparkles" size={17} />
                Generar práctica
              </>
            )}
          </button>
        </div>
        </>
      ) : (
        <p className="emptyNote">
          <Icon name="paperclip" size={15} />
          Podés adjuntar imágenes, un PDF, TXT o PPTX desde el compositor.
        </p>
      )}
    </div>
  );
}
