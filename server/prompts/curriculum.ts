import {
  CURRICULUM_COUNTRY_LABELS,
  CURRICULUM_COUNTRY_PROFILES,
  type CurriculumCountry,
} from '../../shared/curriculum.js';

export function buildCurriculumFragment(
  country?: CurriculumCountry,
): string {
  if (!country || country === 'general') return '';
  const profile = CURRICULUM_COUNTRY_PROFILES[country];
  const label = CURRICULUM_COUNTRY_LABELS[country];
  return [
    `Currículo de referencia: ${label}.`,
    `Etapas: ${profile.stages}.`,
    `Examen de referencia: ${profile.exam}.`,
    `Marco curricular: ${profile.framework}.`,
    'Alineá ejemplos, temas y terminología a ese contexto; si el material del usuario indica otra cosa, priorizá su material.',
    'Son referencias generales: no afirmes que el contenido o las preguntas son oficiales.',
  ].join(' ');
}
