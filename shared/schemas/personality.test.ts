import { describe, expect, it } from 'vitest';
import {
  PERSONALITY_PRESETS,
  personalityConfigSchema,
} from './personality';

describe('personalityConfigSchema', () => {
  it('aplica la personalidad Cope por defecto', () => {
    expect(personalityConfigSchema.parse({})).toEqual({
      preset: 'cope',
      name: 'Cope',
    });
  });

  it('normaliza nombre e instrucciones', () => {
    expect(
      personalityConfigSchema.parse({
        preset: 'examinador',
        name: '  Profe Ana  ',
        instructions: '  Sé formal y breve.  ',
      }),
    ).toEqual({
      preset: 'examinador',
      name: 'Profe Ana',
      instructions: 'Sé formal y breve.',
    });
    expect(
      personalityConfigSchema.parse({
        preset: 'cercano',
        name: 'Cope',
        instructions: '   ',
      }).instructions,
    ).toBeUndefined();
  });

  it('rechaza presets desconocidos y nombres inválidos', () => {
    expect(
      personalityConfigSchema.safeParse({ preset: 'pirata', name: 'Cope' })
        .success,
    ).toBe(false);
    expect(
      personalityConfigSchema.safeParse({ preset: 'cope', name: '   ' })
        .success,
    ).toBe(false);
    expect(
      personalityConfigSchema.safeParse({
        preset: 'cope',
        name: 'a'.repeat(25),
      }).success,
    ).toBe(false);
    expect(
      personalityConfigSchema.safeParse({
        preset: 'cope',
        name: '<script>',
      }).success,
    ).toBe(false);
  });

  it('limita las instrucciones libres', () => {
    expect(
      personalityConfigSchema.safeParse({
        preset: 'cope',
        name: 'Cope',
        instructions: 'a'.repeat(601),
      }).success,
    ).toBe(false);
  });

  it('expone los cuatro presets', () => {
    expect(PERSONALITY_PRESETS).toEqual([
      'cope',
      'examinador',
      'cercano',
      'exigente',
    ]);
  });
});
