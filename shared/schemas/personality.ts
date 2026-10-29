import { z } from 'zod';

export const PERSONALITY_PRESETS = [
  'cope',
  'examinador',
  'cercano',
  'exigente',
] as const;

const NAME_PATTERN = /^[\p{L}\p{M}\p{N} .'’_-]+$/u;

export const RESPONSE_LANGUAGE_CODES = [
  'es',
  'en',
  'pt',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh',
  'ar',
  'hi',
  'ru',
  'uk',
  'nl',
  'pl',
  'tr',
  'sv',
  'no',
  'da',
  'fi',
  'cs',
  'sk',
  'ro',
  'hu',
  'el',
  'he',
  'id',
  'ms',
  'vi',
  'th',
  'tl',
  'bn',
  'fa',
  'sw',
  'ca',
  'gl',
  'eu',
  'sr',
] as const;

export type ResponseLanguage = (typeof RESPONSE_LANGUAGE_CODES)[number];

export const responseLanguageSchema = z.enum(RESPONSE_LANGUAGE_CODES);

export const RESPONSE_LANGUAGE_LABELS: Record<ResponseLanguage, string> = {
  es: 'Español',
  en: 'Inglés',
  pt: 'Portugués',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  ja: 'Japonés',
  ko: 'Coreano',
  zh: 'Chino',
  ar: 'Árabe',
  hi: 'Hindi',
  ru: 'Ruso',
  uk: 'Ucraniano',
  nl: 'Neerlandés',
  pl: 'Polaco',
  tr: 'Turco',
  sv: 'Sueco',
  no: 'Noruego',
  da: 'Danés',
  fi: 'Finés',
  cs: 'Checo',
  sk: 'Eslovaco',
  ro: 'Rumano',
  hu: 'Húngaro',
  el: 'Griego',
  he: 'Hebreo',
  id: 'Indonesio',
  ms: 'Malayo',
  vi: 'Vietnamita',
  th: 'Tailandés',
  tl: 'Filipino',
  bn: 'Bengalí',
  fa: 'Persa',
  sw: 'Suajili',
  ca: 'Catalán',
  gl: 'Gallego',
  eu: 'Euskera',
  sr: 'Serbio',
};

export const personalityConfigSchema = z.object({
  preset: z.enum(PERSONALITY_PRESETS).default('cope'),
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío.')
    .max(24, 'El nombre admite hasta 24 caracteres.')
    .regex(NAME_PATTERN, 'El nombre contiene caracteres no permitidos.')
    .default('Cope'),
  language: z.enum(RESPONSE_LANGUAGE_CODES).default('es'),
  instructions: z
    .string()
    .trim()
    .max(600, 'Las instrucciones admiten hasta 600 caracteres.')
    .transform((value) => (value ? value : undefined))
    .optional(),
});

export type PersonalityPreset = (typeof PERSONALITY_PRESETS)[number];
export type PersonalityConfig = z.infer<typeof personalityConfigSchema>;
