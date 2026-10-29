// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadOwnerCode,
  loadVoiceSettings,
  saveOwnerCode,
  saveVoiceSettings,
} from './voice';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('voice preferences', () => {
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
