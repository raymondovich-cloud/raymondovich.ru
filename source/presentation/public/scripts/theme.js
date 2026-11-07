const root = document.documentElement;
const themeButtons = document.querySelectorAll('[data-theme-toggle]');
const storedTheme = localStorage.getItem('raymondovich-theme');
const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
  ? storedTheme
  : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
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
  localStorage.setItem('raymondovich-theme', nextTheme);
  applyTheme(nextTheme);
}));
