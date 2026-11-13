import { resolveWorkspaceRoute } from "../../application/workspace/resolve-workspace-route.js";

const publicHome = document.querySelector("#public-home");
const authRoot = document.querySelector("#auth-root");
const workspaceRoot = document.querySelector("#workspace-root");
let workspaceStarted = false;
let authModuleStarted = false;

function currentRoute() {
  return window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
}

async function renderEntry() {
  const authMode = new URLSearchParams(window.location.search).get("auth");
  if (["login", "register", "callback", "recovery"].includes(authMode)) {
    publicHome.hidden = true;
    authRoot.hidden = false;
    workspaceRoot.hidden = true;
    document.body.className = "ds-public-home ds-auth-page";
    document.title = authMode === "recovery" ? "Новый пароль — Raymondovich" : "Авторизация — Raymondovich";
    document.querySelector("#auth-panel").hidden = !["login", "register"].includes(authMode);
    document.querySelector("#auth-callback-panel").hidden = authMode !== "callback";
    document.querySelector("#password-panel").hidden = authMode !== "recovery";
    if (authMode === "login" || authMode === "register") {
      if (!authModuleStarted) {
        authModuleStarted = true;
        await import("../auth/auth.js");
      }
      if (authMode === "register") document.querySelector('[data-mode="register"]')?.click();
    } else if (authMode === "callback") {
      await import("../auth/auth-callback.js");
    } else {
      await import("../auth/update-password.js");
    }
    return;
  }

  authRoot.hidden = true;
  const route = currentRoute();
  const isWorkspaceRoute = Boolean(resolveWorkspaceRoute(route));
  if (!isWorkspaceRoute) {
    if (route) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    publicHome.hidden = false;
    workspaceRoot.hidden = true;
    document.body.className = "ds-public-home";
    document.title = "Raymondovich";
    return;
  }

  try {
    window.sessionStorage.setItem("raymondovich-auth-return", `/#${route}`);
  } catch {
    // Routing still works when session storage is unavailable.
  }
  publicHome.hidden = true;
  workspaceRoot.hidden = false;
  document.body.className = "ds-workspace";
  if (!workspaceStarted) {
    workspaceStarted = true;
    await import("../workspace/workspace.js?v=20261113-2");
  }
}

window.addEventListener("hashchange", renderEntry);
window.addEventListener("popstate", renderEntry);
renderEntry();