import { z } from 'zod';

export const PERSONALITY_PRESETS = [
  'cope',
  'examinador',
  'cercano',
  'exigente',
] as const;

const NAME_PATTERN = /^[\p{L}\p{M}\p{N} .'’_-]+$/u;

export const personalityConfigSchema = z.object({
  preset: z.enum(PERSONALITY_PRESETS).default('cope'),
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío.')
    .max(24, 'El nombre admite hasta 24 caracteres.')
    .regex(NAME_PATTERN, 'El nombre contiene caracteres no permitidos.')
    .default('Cope'),
  instructions: z
    .string()
    .trim()
    .max(600, 'Las instrucciones admiten hasta 600 caracteres.')
    .transform((value) => (value ? value : undefined))
    .optional(),
});

export type PersonalityPreset = (typeof PERSONALITY_PRESETS)[number];
export type PersonalityConfig = z.infer<typeof personalityConfigSchema>;
