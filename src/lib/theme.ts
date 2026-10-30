export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'cope-theme';

export function getStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
    // El tema por defecto es el oscuro de marca; "system" sigue disponible
    // como opción explícita en Ajustes para seguir al sistema operativo.
    return 'dark';
  } catch {
    return 'dark';
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
    // "system" se guarda explícitamente: si se borrara la clave, al recargar
    // se aplicaría el tema por defecto (oscuro) en lugar del del sistema.
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // El tema sigue funcionando en memoria si el almacenamiento no está disponible.
  }
}
