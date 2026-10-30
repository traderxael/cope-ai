(() => {
  try {
    const saved = window.localStorage.getItem('cope-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Debe coincidir con getStoredTheme() en src/lib/theme.ts: sin
    // preferencia guardada arranca en el tema oscuro de marca.
    const resolved =
      saved === 'light' || saved === 'dark'
        ? saved
        : saved === 'system'
          ? prefersDark
            ? 'dark'
            : 'light'
          : 'dark';
    document.documentElement.dataset.theme = resolved;
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
})();
