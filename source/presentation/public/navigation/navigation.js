import { getPlatform, openExternal } from "/source/platform/bridge.js";

const menuButtons = document.querySelectorAll("[data-menu-toggle]");
const closeTargets = document.querySelectorAll("[data-menu-close]");
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
  const routeKey = String(state.route || rootRoute).replace(/^#/, "").split("/")[0];
  const pageByRoute = {
    "ecosystem-projects": "ecosystem-projects",
    "partner-projects": "partner-projects",
    "advertising-projects": "advertising-projects",
    "how-to-join": "how-to-join",
    "settings": "settings",
    "help": "help",
    "plans": "plans",
    "authorization": state.route === "#authorization/ideas" ? "owner-ideas" : state.route.startsWith("#authorization/projects") ? "owner-projects" : "authorization",
    "apply": "public-intake",
    "privacy": "privacy-notice",
    "owner": "owner-control-center",
    "partner-workspace": "partner-workspace",
    "external-workspace": "external-workspace"
  };
  document.body.dataset.page = state.route === rootRoute
    ? "home"
    : (pageByRoute[routeKey] || "home");
  document.dispatchEvent(new CustomEvent("raymondovich:navigation", {
    detail: { ...state, source }
  }));
  const isRoot = state.route === rootRoute && state.screen === "route";
  document.querySelectorAll("[data-global-back]").forEach(backButton => {
    backButton.hidden = isRoot;
    backButton.setAttribute("aria-hidden", String(isRoot));
    backButton.tabIndex = isRoot ? -1 : 0;
  });
}

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  
// Native-style edge swipe: a rightward gesture from the left edge returns
// through the same navigation history used by browser and Telegram controls.
const BACK_SWIPE_EDGE = 24;
const BACK_SWIPE_DISTANCE = 80;
const BACK_SWIPE_VERTICAL_TOLERANCE = 60;
let backSwipe = null;

function canNavigateBack() {
  const state = currentNavigation();
  return Boolean(state && (state.route !== rootRoute || state.screen !== "route"));
}

function isBackSwipeBlocked(target) {
  if (document.body.classList.contains("menu-open")) return true;
  if (document.querySelector(".authenticated-global-search:not([hidden])")) return true;
  return Boolean(target?.closest?.(
    'input, textarea, select, button, a, [contenteditable="true"], [role="button"], [data-no-back-swipe]'
  ));
}

document.addEventListener("touchstart", event => {
  if (event.touches.length !== 1 || !canNavigateBack()) {
    backSwipe = null;
    return;
  }
  const touch = event.touches[0];
  if (touch.clientX > BACK_SWIPE_EDGE || isBackSwipeBlocked(event.target)) {
    backSwipe = null;
    return;
  }
  backSwipe = { identifier: touch.identifier, startX: touch.clientX, startY: touch.clientY, active: true };
}, { capture: true, passive: true });

document.addEventListener("touchmove", event => {
  if (!backSwipe?.active) return;
  if (event.touches.length !== 1) {
    backSwipe = null;
    return;
  }
  const touch = Array.from(event.touches).find(item => item.identifier === backSwipe.identifier);
  if (!touch) {
    backSwipe = null;
    return;
  }
  const deltaX = touch.clientX - backSwipe.startX;
  const deltaY = touch.clientY - backSwipe.startY;
  if (Math.abs(deltaY) > BACK_SWIPE_VERTICAL_TOLERANCE && Math.abs(deltaY) > Math.abs(deltaX)) {
    backSwipe = null;
    return;
  }
  if (deltaX < -8) {
    backSwipe = null;
    return;
  }
  if (deltaX > 8 && Math.abs(deltaX) > Math.abs(deltaY) && event.cancelable) {
    event.preventDefault();
  }
}, { capture: true, passive: false });

document.addEventListener("touchend", event => {
  if (!backSwipe?.active) return;
  const touch = Array.from(event.changedTouches).find(item => item.identifier === backSwipe.identifier);
  const gesture = backSwipe;
  backSwipe = null;
  if (!touch) return;
  const deltaX = touch.clientX - gesture.startX;
  const deltaY = touch.clientY - gesture.startY;
  if (deltaX >= BACK_SWIPE_DISTANCE && Math.abs(deltaY) <= BACK_SWIPE_VERTICAL_TOLERANCE) {
    goBack();
  }
}, { capture: true, passive: true });

document.addEventListener("touchcancel", () => {
  backSwipe = null;
}, { capture: true, passive: true });

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

// External targets keep the browser's existing behavior on Web/PWA.
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || link.target !== "_blank" || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const platform = getPlatform();
  if (platform !== "telegram" && platform !== "native") return;
  const url = new URL(link.href, location.href);
  if (url.origin === location.origin) return;
  event.preventDefault();
  openExternal(url.href);
});
