import {
  CURRICULUM_COUNTRY_LABELS,
  type CurriculumCountry,
} from '../../shared/curriculum.js';

export function buildCurriculumFragment(
  country: CurriculumCountry | undefined,
): string {
  if (!country || country === 'general') return '';
  return `Currículo: cuando des ejemplos, temas o terminología escolar, alinealos al currículo de ${CURRICULUM_COUNTRY_LABELS[country]}. Si el material del usuario indica otra cosa, priorizá su material.`;
}
