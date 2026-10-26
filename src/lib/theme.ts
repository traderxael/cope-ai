export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'cope-theme';

export function getStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function storeTheme(theme: Theme): void {
  try {
    if (theme === 'system') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // El tema sigue funcionando en memoria si el almacenamiento no está disponible.
  }
}
