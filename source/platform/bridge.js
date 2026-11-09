import { platform } from "./bootstrap.js";
import { SITE_URL } from "../config/app-config.js";

const webAdapter = Object.freeze({
  openExternal(url) {
    return window.open(url, "_blank", "noopener,noreferrer");
  },
  isStandalone() {
    return platform === "pwa" || platform === "native";
  },
  haptic() {},
  share(payload) {
    if (navigator.share) return navigator.share(payload);
    return Promise.resolve(false);
  },
  onBackButtonSync() {}
});

let adapter = webAdapter;
if (platform === "telegram") {
  try {
    const { createTelegramAdapter } = await import("./adapters/telegram.js");
    adapter = createTelegramAdapter(window.Telegram?.WebApp) || webAdapter;
  } catch (error) {
    console.warn("Telegram platform adapter unavailable:", error);
  }
}

export function getPlatform() {
  return platform;
}

export function openExternal(url) {
  return adapter.openExternal(url);
}

export function getAuthRedirectUrl() {
  return new URL("/#authorization", SITE_URL).href;
}

export function isStandalone() {
  return adapter.isStandalone();
}

export function haptic(type = "light") {
  return adapter.haptic(type);
}

export function share(payload = {}) {
  return adapter.share(payload);
}

export function onBackButtonSync(isRoot) {
  return adapter.onBackButtonSync(isRoot);
}

window.RaymondovichPlatform = Object.freeze({
  getPlatform,
  openExternal,
  getAuthRedirectUrl,
  isStandalone,
  haptic,
  share,
  onBackButtonSync
});
