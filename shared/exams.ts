import type { CurriculumCountry } from './curriculum.js';

export const EXAM_FORMATS = [
  'general',
  'paes',
  'selectividad',
  'icfes',
  'admision',
] as const;

export type ExamFormat = (typeof EXAM_FORMATS)[number];

const COUNTRY_EXAM_FORMAT: Partial<Record<CurriculumCountry, ExamFormat>> = {
  cl: 'paes',
  es: 'selectividad',
  co: 'icfes',
  mx: 'admision',
};

export function suggestedExamFormat(
  country: CurriculumCountry | undefined,
): ExamFormat {
  if (!country) return 'general';
  return COUNTRY_EXAM_FORMAT[country] ?? 'general';
}

export const EXAM_FORMAT_LABELS: Record<ExamFormat, string> = {
  general: 'General',
  paes: 'PAES (Chile)',
  selectividad: 'Selectividad (España)',
  icfes: 'ICFES Saber 11 (Colombia)',
  admision: 'Admisión (México)',
};

export const EXAM_FORMAT_NOTES: Record<ExamFormat, string> = {
  general: 'Práctica general por materia y nivel.',
  paes: 'Formato orientativo tipo PAES; preguntas generadas, no oficiales.',
  selectividad:
    'Formato orientativo tipo Selectividad; preguntas generadas, no oficiales.',
  icfes: 'Formato orientativo tipo ICFES; preguntas generadas, no oficiales.',
  admision:
    'Formato orientativo de admisión; preguntas generadas, no oficiales.',
};
