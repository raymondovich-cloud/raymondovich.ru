/* Version: 1.1.0 */
/* Updated: 2026-11-16 */

const themeStorageKey = "raymondovich-theme";
const themeToggle = document.querySelector("[data-theme-toggle]");
const root = document.documentElement;

const getPreferredTheme = () => {
  const savedTheme = window.localStorage.getItem(themeStorageKey);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme) => {
  root.dataset.theme = theme;

  if (themeToggle) {
    const nextTheme = theme === "dark" ? "light" : "dark";
    themeToggle.setAttribute(
      "aria-label",
      nextTheme === "dark" ? "Включить тёмную тему" : "Включить светлую тему"
    );
    themeToggle.setAttribute("title", nextTheme === "dark" ? "Тёмная тема" : "Светлая тема");
  }
};

applyTheme(getPreferredTheme());

window.addEventListener("raymondovich:theme-change", (event) => {
  const preference = event.detail?.preference;
  applyTheme(preference === "system" ? getPreferredTheme() : preference);
  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === preference));
  });
});

themeToggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  window.localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
});
