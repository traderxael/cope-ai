import {
  CURRICULUM_COUNTRIES,
  type CurriculumCountry,
} from '../../shared/curriculum';

export const CURRICULUM_STORAGE_KEY = 'cope-curriculum-v1';

function isCountry(value: unknown): value is CurriculumCountry {
  return (
    typeof value === 'string' &&
    CURRICULUM_COUNTRIES.includes(value as CurriculumCountry)
  );
}

export function loadCurriculumCountry(): CurriculumCountry {
  if (typeof localStorage === 'undefined') return 'general';
  try {
    const raw = localStorage.getItem(CURRICULUM_STORAGE_KEY);
    return isCountry(raw) ? raw : 'general';
  } catch {
    return 'general';
  }
}

export function saveCurriculumCountry(
  country: CurriculumCountry,
): CurriculumCountry {
  const next = isCountry(country) ? country : 'general';
  try {
    localStorage.setItem(CURRICULUM_STORAGE_KEY, next);
  } catch {
    // Sin almacenamiento se usa el valor en memoria durante la sesión.
  }
  return next;
}

export function curriculumCountryForRequest():
  | CurriculumCountry
  | undefined {
  const country = loadCurriculumCountry();
  return country === 'general' ? undefined : country;
}
