import type { Level, Mode, Subject } from './schemas/common';
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

export type {
  ChatMessage,
  ChatRequest,
  ContentPart,
  ImagePart,
  Level,
  Mode,
  QuizQuestion,
  QuizRequest,
  QuizResponse,
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

export const DEFAULT_TUTOR: TutorConfig = {
  subject: 'math',
  level: 'secundaria',
};
