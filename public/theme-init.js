(() => {
  try {
    const saved = window.localStorage.getItem('cope-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved =
      saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = resolved;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
