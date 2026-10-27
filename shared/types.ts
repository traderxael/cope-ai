import type {
  Difficulty,
  Level,
  Mode,
  StudyStyle,
  Subject,
} from './schemas/common';
import type {
  ChatMessage,
  ChatRequest,
  ContentPart,
  ImagePart,
  TextPart,
  TutorConfig,
} from './schemas/chat';
import type {
  QuizQuestion,
  QuizRequest,
  QuizResponse,
} from './schemas/quiz';
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
} from './schemas/study';

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

export const DEFAULT_TUTOR: TutorConfig = {
  subject: 'math',
  level: 'secundaria',
  style: 'guided',
};
