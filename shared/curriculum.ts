export const CURRICULUM_COUNTRIES = [
  'general',
  'ar',
  'bo',
  'cl',
  'co',
  'ec',
  'es',
  'mx',
  'pe',
  'py',
  'uy',
  've',
] as const;

export type CurriculumCountry = (typeof CURRICULUM_COUNTRIES)[number];

export const CURRICULUM_COUNTRY_LABELS: Record<CurriculumCountry, string> = {
  general: 'General',
  ar: 'Argentina',
  bo: 'Bolivia',
  cl: 'Chile',
  co: 'Colombia',
  ec: 'Ecuador',
  es: 'España',
  mx: 'México',
  pe: 'Perú',
  py: 'Paraguay',
  uy: 'Uruguay',
  ve: 'Venezuela',
};
