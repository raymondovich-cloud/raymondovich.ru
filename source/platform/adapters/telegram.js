export function createTelegramAdapter(webApp) {
  if (!webApp) return null;

  try {
    webApp.ready();
    webApp.expand();
  } catch (error) {
    console.warn("Telegram WebApp initialization warning:", error);
  }

  function syncTheme() {
    const scheme = webApp.colorScheme === "light" ? "light" : "dark";
    document.documentElement.dataset.tgColorScheme = scheme;
  }

  syncTheme();
  webApp.onEvent?.("themeChanged", syncTheme);
  webApp.BackButton?.onClick?.(() => window.RaymondovichNavigation?.back());

  return Object.freeze({
    openExternal(url) {
      const target = new URL(url, location.href);
      if (target.hostname === "t.me" || target.hostname.endsWith(".t.me")) {
        webApp.openTelegramLink(target.href);
      } else {
        webApp.openLink(target.href, { try_instant_view: false });
      }
    },
    isStandalone() {
      return true;
    },
    haptic(type = "light") {
      const feedback = webApp.HapticFeedback;
      if (!feedback) return;
      if (["success", "warning", "error"].includes(type)) feedback.notificationOccurred(type);
      else feedback.impactOccurred(["light", "medium", "heavy", "rigid", "soft"].includes(type) ? type : "light");
    },
    share(payload = {}) {
      if (payload.text && webApp.switchInlineQuery) {
        webApp.switchInlineQuery(String(payload.text));
        return true;
      }
      if (payload.url) {
        webApp.openLink(String(payload.url));
        return true;
      }
      return false;
    },
    onBackButtonSync(isRoot) {
      if (!webApp.BackButton) return;
      if (isRoot) webApp.BackButton.hide();
      else webApp.BackButton.show();
    }
  });
}
