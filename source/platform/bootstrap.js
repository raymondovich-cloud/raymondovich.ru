import { detectPlatform } from "./detect.js";

const TELEGRAM_SCRIPT_URL = "https://telegram.org/js/telegram-web-app.js?64";
const TELEGRAM_KEYS = ["tgWebAppData", "tgWebAppVersion", "tgWebAppPlatform", "tgWebAppThemeParams", "tgWebAppStartParam"];
const START_ROUTES = Object.freeze({
  projects: "#authorization/projects",
  ideas: "#authorization/ideas",
  authorization: "#authorization",
  home: "/"
});

function readTelegramParameters() {
  const query = new URLSearchParams(location.search);
  const hashText = location.hash.replace(/^#/, "");
  const hash = new URLSearchParams(hashText);
  const params = new Map();
  TELEGRAM_KEYS.forEach((key) => {
    if (query.has(key)) params.set(key, query.get(key));
    else if (hash.has(key)) params.set(key, hash.get(key));
  });
  return { query, hash, hashText, params };
}

function loadTelegramSdk() {
  if (window.Telegram?.WebApp) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = TELEGRAM_SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = resolve;
    const timeout = window.setTimeout(resolve, 7000);
    script.addEventListener("load", () => window.clearTimeout(timeout), { once: true });
    script.addEventListener("error", () => window.clearTimeout(timeout), { once: true });
    document.head.append(script);
  });
}

function cleanTelegramParameters(parsed) {
  const { query, hash, hashText, params } = parsed;
  const queryHadTelegram = TELEGRAM_KEYS.some((key) => query.has(key));
  const hashSegments = hashText.split("&");
  const routeSegment = hashSegments.find((segment) => segment && !TELEGRAM_KEYS.some((key) => segment.startsWith(key + "=")));
  const hashHadTelegram = TELEGRAM_KEYS.some((key) => hash.has(key));
  const currentRoute = hashHadTelegram
    ? (routeSegment && !routeSegment.includes("=") ? "#" + routeSegment : "")
    : location.hash;
  const startParam = params.get("tgWebAppStartParam") || window.Telegram?.WebApp?.initDataUnsafe?.start_param || "";
  const mappedRoute = Object.prototype.hasOwnProperty.call(START_ROUTES, startParam) ? START_ROUTES[startParam] : "";
  const nextRoute = currentRoute || mappedRoute || (hashHadTelegram ? "" : location.hash);

  TELEGRAM_KEYS.forEach((key) => query.delete(key));
  const search = query.toString();
  const nextSearch = search ? "?" + search : "";
  const nextHash = nextRoute && nextRoute !== "/" ? nextRoute : "";
  if (queryHadTelegram || hashHadTelegram || (mappedRoute && !currentRoute)) {
    history.replaceState(history.state, "", location.pathname + nextSearch + nextHash);
  }
}

async function initializePlatform() {
  const platform = detectPlatform();
  document.documentElement.dataset.platform = platform;

  if (platform !== "telegram") return platform;

  const parsed = readTelegramParameters();
  await loadTelegramSdk();
  const webApp = window.Telegram?.WebApp;
  const launchParams = Object.fromEntries(parsed.params.entries());
  window.RaymondovichTelegramLaunch = Object.freeze({
    params: Object.freeze(launchParams),
    initData: webApp?.initData || launchParams.tgWebAppData || ""
  });
  cleanTelegramParameters(parsed);
  return platform;
}

export const platform = await initializePlatform();
