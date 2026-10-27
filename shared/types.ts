import type {
  Difficulty,
  Level,
  Mode,
  StudyStyle,
  Subject,
} from './schemas/common.js';
import type {
  PersonalityConfig,
  PersonalityPreset,
} from './schemas/personality.js';
import type {
  OralExamConfig,
  OralExamRequest,
  OralExamResponse,
  OralGradeResponse,
  OralGradeResult,
  OralQuestion,
} from './schemas/oral-exam.js';
import type {
  ChatMessage,
  ChatRequest,
  ContentPart,
  ImagePart,
  TextPart,
  TutorConfig,
} from './schemas/chat.js';
import type {
  QuizQuestion,
  QuizRequest,
  QuizResponse,
} from './schemas/quiz.js';
import type {
  Flashcard,
  FlashcardRequest,
  FlashcardResponse,
  PlanTaskType,
  StudyPlanContent,
  StudyPlanDay,
  StudyPlanRequest,
  StudyPlanResponse,
  StudyPlanTask,
} from './schemas/study.js';

export type {
  ChatMessage,
  ChatRequest,
  ContentPart,
  Difficulty,
  Flashcard,
  FlashcardRequest,
  FlashcardResponse,
  ImagePart,
  Level,
  Mode,
  OralExamConfig,
  OralExamRequest,
  OralExamResponse,
  OralGradeResponse,
  OralGradeResult,
  OralQuestion,
  PersonalityConfig,
  PersonalityPreset,
  PlanTaskType,
  QuizQuestion,
  QuizRequest,
  QuizResponse,
  StudyPlanContent,
  StudyPlanDay,
  StudyPlanRequest,
  StudyPlanResponse,
  StudyPlanTask,
  StudyStyle,
  Subject,
  TextPart,
  TutorConfig,
};

export const MODE_LABELS: Record<Mode, string> = {
  assistant: 'Asistente',
  tutor: 'Tutor',
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: 'Matemáticas',
  physics: 'Física',
  chemistry: 'Química',
  general: 'General',
};

export const LEVEL_LABELS: Record<Level, string> = {
  primaria: 'Primaria',
  secundaria: 'Secundaria',
  bachillerato: 'Bachillerato',
  universidad: 'Universidad',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
};

export const STUDY_STYLE_LABELS: Record<StudyStyle, string> = {
  guided: 'Guiado',
  solver: 'Solución',
};

export const PLAN_TASK_TYPE_LABELS: Record<
  StudyPlanTask['type'],
  string
> = {
  study: 'Estudio',
  practice: 'Práctica',
  review: 'Repaso',
  rest: 'Descanso',
};

export const PERSONALITY_LABELS: Record<PersonalityPreset, string> = {
  cope: 'Cope',
  examinador: 'Examinador estricto',
  cercano: 'Tutor cercano',
  exigente: 'Reto exigente',
};

export const PERSONALITY_DESCRIPTIONS: Record<PersonalityPreset, string> = {
  cope: 'Equilibrado y claro: explica, pregunta y verifica.',
  examinador: 'Formal y riguroso: evalúa precisión y evidencia.',
  cercano: 'Paciente y cálido: ejemplos, pasos y ánimo.',
  exigente: 'Te lleva al límite: más dificultad y justificación.',
};

export const DEFAULT_PERSONALITY: PersonalityConfig = {
  preset: 'cope',
  name: 'Cope',
};

export const ORAL_ZONE_LABELS: Record<
  'segura' | 'practica' | 'refuerzo',
  string
> = {
  segura: 'Zona segura',
  practica: 'Zona de práctica',
  refuerzo: 'Zona de refuerzo',
};

export const ORAL_COUNT_OPTIONS = [3, 5, 8] as const;

export const DEFAULT_TUTOR: TutorConfig = {
  subject: 'math',
  level: 'secundaria',
  style: 'guided',
};
