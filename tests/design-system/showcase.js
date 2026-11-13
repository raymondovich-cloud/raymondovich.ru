const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themeLabel = document.querySelector('#theme-label');
const dialog = document.querySelector('#showcase-dialog');

function updateThemeLabel() {
  const isDark = root.dataset.theme === 'dark';
  themeLabel.textContent = isDark ? 'Тёмная' : 'Светлая';
  themeToggle.setAttribute('aria-label', isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
}

themeToggle.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  updateThemeLabel();
});

document.querySelectorAll('.ds-segmented__item').forEach((item) => {
  item.addEventListener('click', () => {
    item.parentElement.querySelectorAll('.ds-segmented__item').forEach((peer) => {
      peer.setAttribute('aria-pressed', String(peer === item));
    });
  });
});

document.querySelectorAll('.ds-switch').forEach((item) => {
  item.addEventListener('click', () => {
    item.setAttribute('aria-checked', String(item.getAttribute('aria-checked') !== 'true'));
  });
});

document.querySelector('#show-dialog').addEventListener('click', () => dialog.showModal());
document.querySelector('#replay-motion').addEventListener('click', () => {
  const sample = document.querySelector('.ds-motion-enter');
  sample.classList.remove('ds-motion-enter');
  void sample.offsetWidth;
  sample.classList.add('ds-motion-enter');
});

updateThemeLabel();
