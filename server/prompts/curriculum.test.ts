import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_COUNTRIES,
  CURRICULUM_COUNTRY_PROFILES,
  CURRICULUM_OFFICIAL_SOURCES,
} from '../../shared/curriculum';
import { buildCurriculumFragment } from './curriculum';

describe('buildCurriculumFragment', () => {
  it('no agrega contexto para General ni sin país', () => {
    expect(buildCurriculumFragment()).toBe('');
    expect(buildCurriculumFragment('general')).toBe('');
  });

  it('incluye etapas, examen y marco con advertencia de no oficialidad', () => {
    const fragment = buildCurriculumFragment('cl');
    expect(fragment).toContain('Chile');
    expect(fragment).toContain('PAES');
    expect(fragment).toContain('Bases Curriculares');
    expect(fragment).toContain('no afirmes que el contenido');
  });

  it('define un perfil para cada país del currículo', () => {
    for (const code of CURRICULUM_COUNTRIES) {
      if (code === 'general') continue;
      const profile = CURRICULUM_COUNTRY_PROFILES[code];
      expect(profile.stages.length).toBeGreaterThan(5);
      expect(profile.exam.length).toBeGreaterThan(10);
      expect(profile.framework.length).toBeGreaterThan(5);
      const source = CURRICULUM_OFFICIAL_SOURCES[code];
      expect(source.label.length).toBeGreaterThan(3);
      expect(source.url).toMatch(/^https:\/\//);
    }
  });
});
