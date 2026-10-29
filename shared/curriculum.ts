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

export interface CurriculumProfile {
  stages: string;
  exam: string;
  framework: string;
}

export const CURRICULUM_COUNTRY_PROFILES: Record<
  Exclude<CurriculumCountry, 'general'>,
  CurriculumProfile
> = {
  ar: {
    stages: 'primaria y secundaria',
    exam: 'sin examen nacional único; muchas universidades tienen curso de ingreso o examen propio',
    framework: 'Núcleos de Aprendizajes Prioritarios y diseños curriculares jurisdiccionales',
  },
  bo: {
    stages: 'primaria y secundaria con bachillerato',
    exam: 'cada universidad define su examen o proceso de admisión',
    framework: 'currículo del Ministerio de Educación',
  },
  cl: {
    stages: 'educación básica y media',
    exam:
      'PAES (DEMRE) con Competencia Lectora, Matemática M1/M2, Historia y Ciencias Sociales, y Ciencias',
    framework: 'Bases Curriculares del currículo nacional',
  },
  co: {
    stages: 'primaria, secundaria y media',
    exam:
      'Saber 11 (ICFES) con Lectura Crítica, Matemáticas, Sociales y Ciudadanas, Ciencias Naturales e Inglés',
    framework: 'lineamientos del Ministerio de Educación Nacional',
  },
  ec: {
    stages: 'Educación General Básica y Bachillerato General Unificado',
    exam: 'cada institución de educación superior define su examen o proceso de admisión',
    framework: 'currículo nacional del Ministerio de Educación',
  },
  es: {
    stages: 'Primaria, ESO y Bachillerato',
    exam: 'EBAU/EvAU (Selectividad) en cada comunidad autónoma',
    framework: 'currículo LOMLOE',
  },
  mx: {
    stages: 'primaria, secundaria y educación media superior',
    exam:
      'cada institución define su examen de admisión; muchas usan el EXANI-II de Ceneval',
    framework: 'planes y programas de la SEP',
  },
  pe: {
    stages: 'inicial, primaria y secundaria',
    exam: 'cada universidad define su examen de admisión',
    framework: 'Currículo Nacional de la Educación Básica',
  },
  py: {
    stages: 'Educación Escolar Básica y Educación Media',
    exam: 'cada universidad define su examen o proceso de admisión',
    framework: 'currículo del Ministerio de Educación y Ciencias',
  },
  uy: {
    stages: 'primaria, educación media básica y media superior',
    exam: 'ingreso con bachillerato; algunas carreras aplican pruebas propias',
    framework: 'currículo de ANEP',
  },
  ve: {
    stages: 'primaria y educación media general',
    exam: 'cada universidad define sus pruebas de admisión',
    framework: 'currículo del Ministerio del Poder Popular para la Educación',
  },
};

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
