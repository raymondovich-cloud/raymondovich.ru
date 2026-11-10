import { renderOwnerControlCenter } from "./owner-control-center.js";
import { renderIdeasWorkspace } from "./ideas.js";
import { renderProjectsWorkspace } from "./projects.js";
import {
  renderProfileScreen,
  renderProfileToolsScreen,
  renderProfileSettings,
  renderProfileEmptyScreen,
  bindProfileInteractions
} from "./profile.js";

const shellObservers = new WeakMap();
const currentShellUsers = new WeakMap();

const TAB_ROUTES = {
  projects: "#authorization/projects",
  ideas: "#authorization/ideas",
  tools: "#authorization/tools",
  profile: "#authorization/profile"
};

const TAB_ICONS = {
  projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
  ideas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M8.2 14.5a7 7 0 1 1 7.6 0c-.9.6-1.3 1.4-1.3 2.5h-5c0-1.1-.4-1.9-1.3-2.5Z"/></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6 4 4M4 20l7-7m-2-2 7-7a4 4 0 0 1 5 5l-7 7M3 4l6 6m-5-8 7 7"/></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6"/></svg>'
};

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function roleLabel(user) {
  const roles = { admin: "Владелец", partner: "Партнёр", student: "Ученик", user: "Пользователь" };
  return roles[user.app_metadata?.role] || "Пользователь";
}

function displayName(user) {
  return user.user_metadata?.display_name
    || user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "Пользователь";
}

function avatarMarkup(user) {
  const candidate = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") {
      return `<img src="${escape(url.href)}" alt="" class="app-tab-avatar">`;
    }
  } catch { /* Use initials when the identity provider has no valid avatar URL. */ }
  return `<span class="app-tab-avatar-fallback" aria-hidden="true">${escape(displayName(user).trim().slice(0, 1).toUpperCase() || "П")}</span>`;
}

function tabMarkup(key, label, user, active) {
  const icon = key === "profile" ? avatarMarkup(user) : TAB_ICONS[key];
  return `<button class="app-tab${active === key ? " is-active" : ""}" type="button"
    data-app-tab="${key}" aria-label="${label}" ${active === key ? 'aria-current="page"' : ""}>
    <span class="app-tab-icon">${icon}</span><span class="app-tab-label">${label}</span>
  </button>`;
}

function shellMarkup(user, active) {
  return `
    <div class="authenticated-app-shell">
      <div class="authenticated-app-content" data-app-view tabindex="-1"></div>
      <nav class="authenticated-bottom-nav" aria-label="Основная навигация">
        ${tabMarkup("projects", "Проекты", user, active)}
        ${tabMarkup("ideas", "Идеи", user, active)}
        ${tabMarkup("tools", "Инструменты", user, active)}
        ${tabMarkup("profile", "Профиль", user, active)}
      </nav>
    </div>`;
}

function renderWelcome(root, user, requestedRoute) {
  const name = displayName(user);
  root.innerHTML = `
    <section class="app-welcome" aria-labelledby="app-welcome-title">
      <p class="app-welcome-eyebrow">RAYMONDOVICH / PRIVATE SPACE</p>
      <div class="app-welcome-mark" aria-hidden="true">R.</div>
      <h1 id="app-welcome-title">Добро пожаловать, <span>${escape(name)}</span></h1>
      <p>Ваше рабочее пространство готово. Здесь собраны доступные разделы экосистемы.</p>
      <span class="app-welcome-role">${escape(roleLabel(user))}</span>
      <button class="app-welcome-continue" type="button" data-app-welcome-continue>Перейти к работе <span aria-hidden="true">→</span></button>
    </section>`;
  root.dataset.appWelcomeRoute = requestedRoute;
}

function activeTabForRoute(route) {
  if (route === TAB_ROUTES.projects) return "projects";
  if (route === TAB_ROUTES.ideas) return "ideas";
  if (route === TAB_ROUTES.tools) return "tools";
  return "profile";
}

function renderTools(view) {
  view.dataset.appScreen = "tools";
  view.innerHTML = `
    <section class="app-placeholder-screen" aria-labelledby="tools-title">
      <p class="app-placeholder-eyebrow">RAYMONDOVICH / TOOLS</p>
      <h1 id="tools-title">Инструменты</h1>
      <div class="app-placeholder-state"><span class="app-placeholder-mark" aria-hidden="true">⌘</span><strong>В разработке</strong><p>Раздел пока не подключён. Доступные инструменты появятся здесь после реализации.</p></div>
    </section>`;
}

function renderRoute(view, user, route) {
  const role = user.app_metadata?.role || "user";
  const admin = role === "admin";

  if (route === "#authorization" || route === "#authorization/profile") {
    renderProfileScreen(view, user);
    return;
  }
  if (route === "#authorization/profile-tools") {
    renderProfileToolsScreen(view, user);
    return;
  }
  if (route === "#authorization/profile-settings") {
    renderProfileSettings(view, user);
    return;
  }
  if (route === "#authorization/favorites") {
    renderProfileEmptyScreen(view, "Избранное", "Избранные проекты и инструменты пока не добавлены.");
    return;
  }
  if (route === "#authorization/reports") {
    renderProfileEmptyScreen(view, "Отчёты", "Отчётов пока нет. Данные появятся после подключения соответствующих модулей.");
    return;
  }
  if (route === "#authorization/modules") {
    renderProfileEmptyScreen(view, "Управление модулями", "Модуль управления подпиской готовится. Сейчас подключение модулей, цены и платежи недоступны.");
    return;
  }
  if (route === "#authorization/tools") {
    renderTools(view);
    return;
  }
  if (route === "#authorization/control-center") {
    if (!admin) {
      renderProfileEmptyScreen(view, "Нет доступа", "Этот раздел доступен только владельцу платформы.");
      return;
    }
    view.dataset.appScreen = "control-center";
    view.innerHTML = renderOwnerControlCenter(user);
    return;
  }
  if (route === "#authorization/projects") {
    if (!admin) {
      renderProfileEmptyScreen(view, "Проекты", "Доступ к реестру проектов пока не предоставлен для этой роли.");
      return;
    }
    view.dataset.appScreen = "projects";
    renderProjectsWorkspace(view, user);
    return;
  }
  if (route === "#authorization/ideas") {
    if (!admin) {
      renderProfileEmptyScreen(view, "Идеи", "Доступ к реестру идей пока не предоставлен для этой роли.");
      return;
    }
    view.dataset.appScreen = "ideas";
    renderIdeasWorkspace(view, user);
    return;
  }
  renderProfileScreen(view, user);
}

function syncFullscreenState(shell) {
  const view = shell.querySelector("[data-app-view]");
  const isFormOpen = view?.dataset.appScreen === "profile-settings" || Boolean(view?.querySelector(
    ".projects-form-screen, [data-ideas-form]:not([hidden]), [data-project-form]"
  ));
  shell.classList.toggle("has-fullscreen-form", isFormOpen);
}

function bindShell(root, user) {
  if (root.dataset.appShellBound === "true") return;
  root.dataset.appShellBound = "true";
  root.addEventListener("click", event => {
    const tab = event.target.closest("[data-app-tab]");
    if (tab) {
      window.RaymondovichNavigation?.navigateRoute(TAB_ROUTES[tab.dataset.appTab]);
      return;
    }
    if (event.target.closest("[data-app-welcome-continue]")) {
      const requested = root.dataset.appWelcomeRoute;
      root.dataset.welcomeComplete = "true";
      try { sessionStorage.setItem("raymondovich.auth-welcome-complete", "1"); } catch { /* The root state remains available as a fallback. */ }
      const activeUser = currentShellUsers.get(root) || user;
      const target = requested && requested !== "#authorization"
        ? requested
        : (activeUser.app_metadata?.role === "admin" ? TAB_ROUTES.projects : TAB_ROUTES.profile);
      const currentRoute = window.RaymondovichNavigation?.getState()?.route || location.hash;
      if (target === currentRoute) renderAuthenticatedApp(root, user);
      else {
        window.RaymondovichNavigation?.navigateRoute(target);
        if (!window.RaymondovichNavigation) location.hash = target;
      }
    }
  });
  const observer = new MutationObserver(() => {
    const appShell = root.querySelector(".authenticated-app-shell");
    if (appShell) syncFullscreenState(appShell);
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  shellObservers.set(root, observer);
}

export function renderAuthenticatedApp(root, user) {
  if (!root || !user) return;
  currentShellUsers.set(root, user);
  const state = window.RaymondovichNavigation?.getState();
  const route = state?.route || location.hash || "#authorization";
  bindShell(root, user);
  let welcomed = root.dataset.welcomeComplete === "true";
  try { welcomed = welcomed || sessionStorage.getItem("raymondovich.auth-welcome-complete") === "1"; } catch { /* Use the root state when storage is unavailable. */ }

  if (!welcomed) {
    document.body.dataset.page = "authenticated-welcome";
    renderWelcome(root, user, route);
    return;
  }

  const active = activeTabForRoute(route);
  let shell = root.querySelector(".authenticated-app-shell");
  let view = shell?.querySelector("[data-app-view]");

  if (!shell || !view) {
    root.innerHTML = shellMarkup(user, active);
    shell = root.querySelector(".authenticated-app-shell");
    view = shell?.querySelector("[data-app-view]");
  } else {
    shell.querySelectorAll("[data-app-tab]").forEach(tab => {
      const isActive = tab.dataset.appTab === active;
      tab.classList.toggle("is-active", isActive);
      if (isActive) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  document.body.dataset.page = "authenticated-workspace";
  renderRoute(view, user, route);
  syncFullscreenState(shell);
  bindProfileInteractions(view, target => window.RaymondovichNavigation?.navigateRoute(target));
}
