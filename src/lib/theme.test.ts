// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  storeTheme,
} from './theme';

describe('tema', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('arranca en oscuro cuando no hay preferencia guardada', () => {
    expect(getStoredTheme()).toBe('dark');
  });

  it('recupera la preferencia guardada', () => {
    storeTheme('light');
    expect(getStoredTheme()).toBe('light');
    storeTheme('dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('conserva la opción system entre recargas', () => {
    storeTheme('system');
    expect(getStoredTheme()).toBe('system');
    expect(
      window.localStorage.getItem('cope-theme'),
    ).toBe('system');
  });

  it('aplica el tema elegido al documento', () => {
    expect(applyTheme('light')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(applyTheme('dark')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('resuelve system según el sistema operativo', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    expect(resolveTheme('system')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');

    window.matchMedia = original;
  });
});
