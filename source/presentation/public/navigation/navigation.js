const menuButtons = document.querySelectorAll("[data-menu-toggle]");
const closeTargets = document.querySelectorAll("[data-menu-close]");
const header = document.querySelector(".site-header .header-inner");
const menuButton = document.querySelector(".header-menu-toggle");
const rootRoute = "/";

function routeFromLocation() {
  return location.hash || rootRoute;
}

function parentForDirectRoute(route) {
  if (route.startsWith("#authorization/")) return "#authorization";
  if (route.startsWith("#partner-workspace/")) return "#partner-workspace";
  if (route.startsWith("#external-workspace/")) return "#external-workspace";
  if (route.startsWith("#owner/")) return "#owner";
  return rootRoute;
}

function currentNavigation() {
  return history.state?.raymondovichNavigation || null;
}

function emitNavigation(source = "navigation") {
  const state = currentNavigation() || {
    route: routeFromLocation(),
    screen: "route",
    data: null,
    parentRoute: parentForDirectRoute(routeFromLocation()),
    parentScreen: "route",
    direct: true
  };
  document.dispatchEvent(new CustomEvent("raymondovich:navigation", {
    detail: { ...state, source }
  }));
  const isRoot = state.route === rootRoute && state.screen === "route";
  const backButton = document.querySelector("[data-global-back]");
  if (backButton) {
    backButton.hidden = isRoot;
    backButton.setAttribute("aria-hidden", String(isRoot));
    backButton.tabIndex = isRoot ? -1 : 0;
  }
}

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  menuButtons.forEach((button) => button.setAttribute("aria-expanded", String(open)));
}

function writeState(state, url, replace = false) {
  const payload = { ...(history.state || {}), raymondovichNavigation: state };
  if (replace) history.replaceState(payload, "", url);
  else history.pushState(payload, "", url);
  emitNavigation(replace ? "replace" : "push");
}

function navigateRoute(route, options = {}) {
  const current = currentNavigation();
  const target = route || rootRoute;
  if (target === routeFromLocation() && current?.screen === "route") return;
  const next = {
    route: target,
    screen: "route",
    data: null,
    parentRoute: current?.route || rootRoute,
    parentScreen: current?.screen || "route",
    direct: false
  };
  writeState(next, target === rootRoute ? "/" : target, Boolean(options.replace));
  setMenu(false);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function navigateScreen(screen, data = {}, options = {}) {
  const current = currentNavigation() || {
    route: routeFromLocation(),
    screen: "route",
    parentRoute: parentForDirectRoute(routeFromLocation()),
    parentScreen: "route",
    direct: true
  };
  const replacing = Boolean(options.replace);
  const next = {
    route: current.route,
    screen,
    data,
    parentRoute: replacing ? (current.parentRoute || current.route) : current.route,
    parentScreen: replacing ? (current.parentScreen || "route") : current.screen,
    direct: replacing ? Boolean(current.direct) : false
  };
  writeState(next, location.href, replacing);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function goBack(fallbackRoute) {
  const current = currentNavigation();
  if (current && !current.direct && current.parentRoute) {
    history.back();
    return;
  }
  const fallback = current?.parentRoute || fallbackRoute || parentForDirectRoute(routeFromLocation());
  const parent = parentForDirectRoute(fallback);
  writeState({
    route: fallback,
    screen: "route",
    data: null,
    parentRoute: parent,
    parentScreen: "route",
    direct: true
  }, fallback === rootRoute ? "/" : fallback, true);
  setMenu(false);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function syncNativeHashChange() {
  const route = routeFromLocation();
  const current = currentNavigation();
  if (current?.route === route) {
    emitNavigation("hashchange");
    return;
  }
  writeState({
    route,
    screen: "route",
    data: null,
    parentRoute: current?.route || parentForDirectRoute(route),
    parentScreen: current?.screen || "route",
    direct: false
  }, location.href, true);
}

const initialRoute = routeFromLocation();
if (!currentNavigation()) {
  const parentRoute = parentForDirectRoute(initialRoute);
  const initialState = {
    route: initialRoute,
    screen: "route",
    data: null,
    parentRoute,
    parentScreen: "route",
    direct: initialRoute !== rootRoute
  };
  history.replaceState({ ...(history.state || {}), raymondovichNavigation: initialState }, "", location.href);
}
if (header && menuButton && !header.querySelector("[data-global-back]")) {
  const back = document.createElement("button");
  back.className = "header-back-toggle";
  back.type = "button";
  back.dataset.globalBack = "";
  back.setAttribute("aria-label", "Назад");
  back.setAttribute("title", "Назад");
  back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7"/></svg>';
  back.addEventListener("click", () => goBack());
  header.insertBefore(back, menuButton);
}
emitNavigation("init");

menuButtons.forEach((button) => button.addEventListener("click", () => {
  setMenu(!document.body.classList.contains("menu-open"));
}));
closeTargets.forEach((target) => target.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});
document.querySelectorAll(".sidebar a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.target && link.target !== "_self") return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  const isAppRoute = url.pathname === "/" && (url.hash || link.getAttribute("href") === "/");
  if (!isAppRoute) return;
  event.preventDefault();
  navigateRoute(url.hash || rootRoute);
});

window.addEventListener("hashchange", syncNativeHashChange);
window.addEventListener("popstate", () => {
  emitNavigation("popstate");
  setMenu(false);
});

window.RaymondovichNavigation = Object.freeze({
  navigateRoute,
  navigateScreen,
  back: goBack,
  getState: currentNavigation
});
