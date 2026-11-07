const root = document.documentElement;

function readStoredTheme() {
  try {
    const value = localStorage.getItem("raymondovich-theme");
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(theme === "light"));
    const label = button.querySelector("[data-theme-label]");
    if (label) label.textContent = theme === "light" ? "Тёмная тема" : "Светлая тема";
  });
}

const initialTheme = readStoredTheme()
  || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
applyTheme(initialTheme);

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-toggle]");
  if (!button) return;
  const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
  try {
    localStorage.setItem("raymondovich-theme", nextTheme);
  } catch {
    // Тема остаётся активной до перезагрузки, если хранилище недоступно.
  }
  applyTheme(nextTheme);
});
