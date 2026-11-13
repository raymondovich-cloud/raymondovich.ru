const ROUTES = new Set(["projects", "ideas", "team", "tools", "profile", "profile/settings"]);
const publicHome = document.querySelector("#public-home");
const workspaceRoot = document.querySelector("#workspace-root");
let workspaceStarted = false;

function currentRoute() {
  return window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
}

async function renderEntry() {
  const route = currentRoute();
  const isWorkspaceRoute = ROUTES.has(route);

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
    await import("../workspace/workspace.js");
  }
}

window.addEventListener("hashchange", renderEntry);
renderEntry();
