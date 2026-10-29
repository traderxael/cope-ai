// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadPersonality,
  resetPersonality,
  savePersonality,
} from './personality';

beforeEach(() => {
  window.localStorage.clear();
});

describe('personality storage', () => {
  it('devuelve la personalidad por defecto si no hay nada', () => {
    expect(loadPersonality()).toEqual({
      preset: 'cope',
      name: 'Cope',
      language: 'es',
    });
  });

  it('guarda y recupera una personalidad válida', () => {
    const saved = savePersonality({
      preset: 'cercano',
      name: 'Mentor',
      language: 'en',
      instructions: 'Con ejemplos.',
    });
    expect(saved.name).toBe('Mentor');
    expect(saved.language).toBe('en');
    expect(loadPersonality()).toEqual({
      preset: 'cercano',
      name: 'Mentor',
      language: 'en',
      instructions: 'Con ejemplos.',
    });
  });

  it('cae al default si el JSON está corrupto o es inválido', () => {
    window.localStorage.setItem('cope-personality-v1', '{');
    expect(loadPersonality()).toEqual({
      preset: 'cope',
      name: 'Cope',
      language: 'es',
    });

    window.localStorage.setItem(
      'cope-personality-v1',
      JSON.stringify({ preset: 'pirata', name: 'X' }),
    );
    expect(loadPersonality()).toEqual({
      preset: 'cope',
      name: 'Cope',
      language: 'es',
    });
  });

  it('restablece la personalidad', () => {
    savePersonality({ preset: 'exigente', name: 'Profe', language: 'it' });
    resetPersonality();
    expect(loadPersonality()).toEqual({
      preset: 'cope',
      name: 'Cope',
      language: 'es',
    });
  });
});
