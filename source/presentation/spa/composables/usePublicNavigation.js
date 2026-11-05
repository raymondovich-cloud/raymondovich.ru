import { onBeforeUnmount, onMounted } from "vue";
import { logout as signOutAccount } from "../../runtime/auth.js";

export function usePublicNavigation(root, { homePath = "/spa.html#/" } = {}) {
  const cleanups = [];

  function listen(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    cleanups.push(() => element.removeEventListener(event, handler));
  }

  function setSidebar(open) {
    const element = root.value;
    if (!element) return;
    element.classList.toggle("side-open", open);
    element.querySelector(".side-toggle")?.setAttribute("aria-expanded", String(open));
    element.querySelector(".mob-toggle")?.setAttribute("aria-expanded", String(open));
  }

  function closeExpandedSections() {
    root.value?.querySelectorAll(".side details[open]").forEach((section) => {
      section.open = false;
    });
  }

  function onKeydown(event) {
    if (event.key === "Escape") setSidebar(false);
  }

  async function logout() {
    const button = root.value?.querySelector(".logout-link");
    const label = button?.querySelector(".pn b");
    if (!button || !label) return;
    const originalLabel = label.textContent;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    label.textContent = "Выходим…";
    try {
      await signOutAccount();
      window.location.assign(homePath);
    } catch (error) {
      label.textContent = originalLabel;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      window.alert(error.message || "Не удалось выйти из аккаунта. Попробуйте ещё раз.");
    }
  }

  onMounted(() => {
    const element = root.value;
    listen(element.querySelector(".side-toggle"), "click", () => setSidebar(!element.classList.contains("side-open")));
    listen(element.querySelector(".mob-toggle"), "click", () => setSidebar(!element.classList.contains("side-open")));
    listen(element.querySelector(".scrim"), "click", () => setSidebar(false));

    element.querySelectorAll("[data-open-side]").forEach((link) => {
      listen(link, "click", (event) => {
        event.preventDefault();
        setSidebar(true);
      });
    });

    element.querySelectorAll(".side summary").forEach((summary) => {
      listen(summary, "click", (event) => {
        if (!element.classList.contains("side-open")) {
          event.preventDefault();
          setSidebar(true);
          summary.parentElement.open = true;
        }
      });
    });

    element.querySelectorAll("a.side-home[href]").forEach((link) => {
      listen(link, "click", closeExpandedSections);
    });

    listen(element.querySelector(".logout-link"), "click", logout);
    listen(document, "keydown", onKeydown);
    if (window.innerWidth > 1100) setSidebar(true);
  });

  onBeforeUnmount(() => cleanups.forEach((cleanup) => cleanup()));
}
