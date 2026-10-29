// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearProfile,
  loadProfile,
  saveProfile,
  type UserProfile,
} from './profile';

const profile: UserProfile = {
  name: '  Ana  ',
  level: 'universidad',
  subjects: ['biology', 'math'],
  createdAt: 1,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('profile storage', () => {
  it('devuelve null sin perfil', () => {
    expect(loadProfile()).toBeNull();
  });

  it('guarda y recupera un perfil normalizado', () => {
    expect(saveProfile(profile)).toMatchObject({
      name: 'Ana',
      level: 'universidad',
      subjects: ['biology', 'math'],
    });
    expect(loadProfile()).toMatchObject({
      name: 'Ana',
      level: 'universidad',
      subjects: ['biology', 'math'],
    });
  });

  it('rechaza perfiles incompletos o corruptos', () => {
    window.localStorage.setItem('cope-profile-v1', '{');
    expect(loadProfile()).toBeNull();
    window.localStorage.setItem(
      'cope-profile-v1',
      JSON.stringify({ ...profile, subjects: ['inventada'] }),
    );
    expect(loadProfile()).toBeNull();
  });

  it('guarda el objetivo y descarta uno inválido', () => {
    expect(saveProfile({ ...profile, goal: 'grades' }).goal).toBe('grades');
    expect(loadProfile()?.goal).toBe('grades');

    window.localStorage.setItem(
      'cope-profile-v1',
      JSON.stringify({ ...profile, goal: 'otro' }),
    );
    expect(loadProfile()?.goal).toBeUndefined();
  });

  it('borra el perfil', () => {
    saveProfile(profile);
    clearProfile();
    expect(loadProfile()).toBeNull();
  });
});
