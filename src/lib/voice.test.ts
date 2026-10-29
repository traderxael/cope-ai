// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadOwnerCode,
  loadVoiceSettings,
  saveOwnerCode,
  saveVoiceSettings,
} from './voice';
import { VOICE_LANGUAGE_LOCALES } from './speech/tts';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('voice preferences', () => {
  it('mapea los idiomas de respuesta a locales de voz', () => {
    expect(VOICE_LANGUAGE_LOCALES.es).toBe('es-ES');
    expect(VOICE_LANGUAGE_LOCALES.en).toBe('en-US');
    expect(VOICE_LANGUAGE_LOCALES.pt).toBe('pt-BR');
    expect(VOICE_LANGUAGE_LOCALES.ja).toBe('ja-JP');
  });

  it('usa navegador y voz cercana por defecto', () => {
    expect(loadVoiceSettings()).toEqual({
      profile: 'cercana',
      mode: 'browser',
      rate: 0,
      pitch: 0,
    });
  });

  it('guarda la voz clonada', () => {
    saveVoiceSettings({
      profile: 'grave',
      mode: 'cloned',
      clonedVoiceId: 'voz-1',
      clonedLabel: 'Mi voz',
    });
    expect(loadVoiceSettings()).toEqual({
      profile: 'grave',
      mode: 'cloned',
      clonedVoiceId: 'voz-1',
      clonedLabel: 'Mi voz',
      rate: 0,
      pitch: 0,
    });
  });

  it('guarda velocidad y tono', () => {
    saveVoiceSettings({
      profile: 'neutra',
      mode: 'browser',
      rate: 20,
      pitch: -2,
    });
    expect(loadVoiceSettings()).toMatchObject({ rate: 20, pitch: -2 });
  });

  it('limita velocidad y tono a rangos seguros', () => {
    saveVoiceSettings({
      profile: 'neutra',
      mode: 'browser',
      rate: 80,
      pitch: 12,
    });
    expect(loadVoiceSettings()).toMatchObject({ rate: 50, pitch: 6 });

    window.localStorage.setItem(
      'cope-voice-v1',
      JSON.stringify({
        profile: 'neutra',
        mode: 'browser',
        rate: -90,
        pitch: -10,
      }),
    );
    expect(loadVoiceSettings()).toMatchObject({ rate: -50, pitch: -6 });
  });

  it('cae al default si la preferencia está corrupta', () => {
    window.localStorage.setItem('cope-voice-v1', '{');
    expect(loadVoiceSettings()).toEqual({
      profile: 'cercana',
      mode: 'browser',
      rate: 0,
      pitch: 0,
    });
  });

  it('guarda el código de propietario solo en la sesión', () => {
    expect(loadOwnerCode()).toBe('');
    saveOwnerCode('  secreto  ');
    expect(loadOwnerCode()).toBe('secreto');
    saveOwnerCode('');
    expect(loadOwnerCode()).toBe('');
  });
});
