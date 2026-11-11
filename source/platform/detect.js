const TELEGRAM_KEYS = ["tgWebAppData", "tgWebAppVersion", "tgWebAppPlatform", "tgWebAppThemeParams", "tgWebAppStartParam"];

function hasTelegramLaunchParameters() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return TELEGRAM_KEYS.some((key) => query.has(key) || hash.has(key));
}

export function detectPlatform() {
  if (hasTelegramLaunchParameters() || Boolean(window.Telegram?.WebApp?.initData)) return "telegram";
  if (window.Capacitor) return "native";
  if (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true) return "pwa";
  return "web";
}
