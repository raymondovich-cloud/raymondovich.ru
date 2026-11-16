/* Version: 1.0.0 */
/* Updated: 2026-11-16 */

/*
 * Temporary development diagnostic entrypoint.
 * Dynamic import exposes module-graph and initialization errors on-device.
 */
const root = document.querySelector("[data-auth-root]");
const statusPanel = document.querySelector(".status-panel");

import("./authentication/authentication.js").catch((error) => {
  if (root) {
    root.hidden = false;
    root.textContent = "";
    const panel = document.createElement("section");
    panel.className = "auth-panel";
    const heading = document.createElement("h1");
    heading.className = "auth-heading";
    heading.textContent = "Ошибка запуска приложения";
    const description = document.createElement("p");
    description.className = "auth-description";
    description.textContent = error?.stack || error?.message || String(error);
    panel.append(heading, description);
    root.append(panel);
  }
  if (statusPanel) statusPanel.hidden = true;
  console.error("[Raymondovich boot diagnostic]", error);
});
