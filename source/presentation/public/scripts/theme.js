const root = document.documentElement;
const themeButtons = document.querySelectorAll('[data-theme-toggle]');
function readStoredTheme() {
  try {
    const value = localStorage.getItem('raymondovich-theme');
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}
const initialTheme = readStoredTheme()
  || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
function applyTheme(theme) {
  root.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(theme === 'light'));
    const label = button.querySelector('[data-theme-label]');
    if (label) label.textContent = theme === 'light' ? 'Тёмная тема' : 'Светлая тема';
  });
}
applyTheme(initialTheme);
themeButtons.forEach((button) => button.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem('raymondovich-theme', nextTheme);
  } catch {
    // Тема продолжает работать до перезагрузки страницы, если хранилище недоступно.
  }
  applyTheme(nextTheme);
}));
