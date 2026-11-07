const menuButtons = document.querySelectorAll('[data-menu-toggle]');
const closeTargets = document.querySelectorAll('[data-menu-close]');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  menuButtons.forEach((button) => button.setAttribute('aria-expanded', String(open)));
}
menuButtons.forEach((button) => button.addEventListener('click', () => {
  setMenu(!document.body.classList.contains('menu-open'));
}));
closeTargets.forEach((target) => target.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});
document.querySelectorAll('.sidebar a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});
