import { supabase } from "../../infrastructure/supabase/client.js";
import { getDefaultWorkspaceRoute, resolveWorkspaceRoute } from "../../application/workspace/resolve-workspace-route.js";

const THEME_KEY = "raymondovich-theme";
const root = document.documentElement;
const SECTION_TITLES = {
  projects: "Проекты",
  ideas: "Идеи",
  team: "Команда",
  tools: "Инструменты",
  profile: "Профиль",
};

function readTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  try {
    window.localStorage.setItem(THEME_KEY, nextTheme);
  } catch {
    // The current page still changes theme if storage is unavailable.
  }
}

function readRoute() {
  const route = window.location.hash.slice(1).replace(/^\/+|\/+$/g, "");
  return resolveWorkspaceRoute(route)?.route ?? getDefaultWorkspaceRoute();
}

function navigate(route, { replace = false } = {}) {
  const hash = `#${route}`;
  if (window.location.hash === hash) {
    renderRoute();
    return;
  }
  if (replace) {
    window.history.replaceState(null, "", hash);
    renderRoute();
  } else {
    window.location.hash = route;
  }
}

applyTheme(readTheme());

const { data, error } = await supabase.auth.getUser();
if (error || !data.user) {
  window.location.replace("/auth.html");
} else {
  const buttons = [...document.querySelectorAll("[data-section]")];
  const title = document.querySelector("#workspace-title");
  const content = document.querySelector("#workspace-placeholder");

  function makeButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function showMessage(message) {
    content.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = "ds-workspace__placeholder";
    paragraph.textContent = message;
    content.append(paragraph);
  }

  function showProfile() {
    content.replaceChildren();
    const settingsButton = makeButton(
      "Настройки",
      "ds-button ds-button--secondary ds-workspace__action",
      () => navigate("profile/settings"),
    );
    content.append(settingsButton);
  }

  function showSettings() {
    content.replaceChildren();

    const backButton = makeButton(
      "← Профиль",
      "ds-button ds-button--secondary ds-workspace__back",
      () => navigate("profile"),
    );

    const group = document.createElement("section");
    group.className = "ds-workspace__settings-group";
    group.setAttribute("aria-labelledby", "appearance-title");

    const heading = document.createElement("h2");
    heading.className = "ds-workspace__settings-heading";
    heading.id = "appearance-title";
    heading.textContent = "Оформление";

    const description = document.createElement("p");
    description.className = "ds-workspace__settings-description";
    description.textContent = "Выберите тему интерфейса.";

    const options = document.createElement("div");
    options.className = "ds-workspace__theme-options";
    options.setAttribute("role", "group");
    options.setAttribute("aria-label", "Тема оформления");

    ["dark", "light"].forEach((theme) => {
      const label = theme === "dark" ? "Тёмная" : "Светлая";
      const option = makeButton(
        label,
        "ds-button ds-button--secondary ds-workspace__theme-option",
        () => {
          applyTheme(theme);
          updateThemeOptions();
        },
      );
      option.dataset.themeOption = theme;
      options.append(option);
    });

    function updateThemeOptions() {
      options.querySelectorAll("[data-theme-option]").forEach((option) => {
        const selected = option.dataset.themeOption === root.dataset.theme;
        option.setAttribute("aria-pressed", String(selected));
        option.classList.toggle("is-selected", selected);
      });
    }

    updateThemeOptions();
    group.append(heading, description, options);
    content.append(backButton, group);
  }

  function renderRoute() {
    const route = readRoute();
    const resolved = resolveWorkspaceRoute(route);
    const section = resolved?.sectionId ?? "projects";

    title.textContent = resolved?.subroute === "settings" ? "Настройки" : SECTION_TITLES[section];

    if (resolved?.subroute === "settings") showSettings();
    else if (section === "profile") showProfile();
    else showMessage("Раздел пока в разработке.");

    buttons.forEach((button) => {
      if (button.dataset.section === section) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    document.title = `${title.textContent} — Raymondovich`;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.section));
  });

  window.addEventListener("hashchange", renderRoute);

  // Keep one HTML application shell; the hash identifies the active workspace view.
  const initialRoute = window.location.hash.slice(1).replace(/^\/+|\/+$/g, "");
  if (!resolveWorkspaceRoute(initialRoute)) {
    navigate(getDefaultWorkspaceRoute(), { replace: true });
  } else {
    renderRoute();
  }

  document.querySelector("#sign-out").addEventListener("click", async () => {
    const button = document.querySelector("#sign-out");
    button.disabled = true;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      button.disabled = false;
      button.textContent = "Не удалось выйти";
      return;
    }
    window.location.replace("/");
  });
}
