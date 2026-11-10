import { searchGlobalContent } from "/source/application/search/global-search.js";

const MIN_QUERY_LENGTH = 2;
const PULL_THRESHOLD = 72;
const TOP_EDGE_START = 96;

const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function panelFor(root) {
  return root.querySelector("[data-global-search]");
}

function renderMessage(root, message, state = "idle") {
  const results = panelFor(root)?.querySelector("[data-global-search-results]");
  if (results) results.innerHTML = `<p class="global-search-message" data-state="${state}">${escape(message)}</p>`;
}

function renderGroups(root, response, resultIndex) {
  const results = panelFor(root)?.querySelector("[data-global-search-results]");
  if (!results) return;
  resultIndex.clear();
  let index = 0;

  if (!response.groups.length) {
    renderMessage(root, response.partial
      ? "Не удалось получить результаты из доступных источников. Повторите попытку позже."
      : "Ничего не найдено. Попробуйте изменить запрос.", response.partial ? "error" : "empty");
    return;
  }

  results.innerHTML = response.groups.map(group => `
    <section class="global-search-group" aria-label="${escape(group.title)}">
      <h2>${escape(group.title)}</h2>
      <div class="global-search-items">
        ${group.items.map(item => {
          const key = String(index++);
          resultIndex.set(key, item);
          return `<button class="global-search-result" type="button" data-global-search-result="${key}">
            <span class="global-search-result-copy">
              <strong>${escape(item.title)}</strong>
              <span>${escape(item.description)}</span>
            </span>
            <span class="global-search-result-arrow" aria-hidden="true">↗</span>
          </button>`;
        }).join("")}
      </div>
    </section>
  `).join("") + (response.partial
    ? '<p class="global-search-partial">Некоторые источники сейчас недоступны. Показаны доступные результаты.</p>'
    : "");
}

export function bindAuthenticatedGlobalSearch(root, getUser) {
  if (!root || root.dataset.globalSearchBound === "true") return;
  root.dataset.globalSearchBound = "true";

  let debounceTimer = null;
  let requestSequence = 0;
  let gesture = null;
  let previousFocus = null;
  const resultIndex = new Map();

  function closeSearch() {
    const panel = panelFor(root);
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.body.classList.remove("global-search-open");
    root.removeAttribute("data-global-search-pulling");
    root.removeAttribute("data-global-search-pull-ready");
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }

  function openSearch() {
    const panel = panelFor(root);
    if (!panel || !panel.hidden) return;
    previousFocus = document.activeElement;
    panel.hidden = false;
    document.body.classList.add("global-search-open");
    const input = panel.querySelector("[data-global-search-input]");
    if (input) {
      input.value = "";
      renderMessage(root, "Введите минимум 2 символа для поиска.");
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }
  }

  async function runSearch(value) {
    const query = String(value || "").trim();
    const sequence = ++requestSequence;
    if (query.length < MIN_QUERY_LENGTH) {
      resultIndex.clear();
      renderMessage(root, "Введите минимум 2 символа для поиска.");
      return;
    }
    renderMessage(root, "Ищем по доступным разделам…", "loading");
    try {
      const response = await searchGlobalContent(query, getUser());
      if (sequence !== requestSequence || panelFor(root)?.hidden) return;
      renderGroups(root, response, resultIndex);
    } catch {
      if (sequence !== requestSequence) return;
      renderMessage(root, "Не удалось выполнить поиск. Проверьте подключение и повторите попытку.", "error");
    }
  }

  root.addEventListener("input", event => {
    if (!event.target.matches("[data-global-search-input]")) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(event.target.value), 240);
  });

  root.addEventListener("click", event => {
    if (event.target.closest("[data-global-search-close]") || event.target === panelFor(root)) {
      closeSearch();
      return;
    }
    const resultButton = event.target.closest("[data-global-search-result]");
    if (!resultButton) return;
    const result = resultIndex.get(resultButton.dataset.globalSearchResult);
    if (!result) return;
    closeSearch();
    if (root.querySelector(".app-welcome")) {
      root.dataset.welcomeComplete = "true";
      try { sessionStorage.setItem("raymondovich.auth-welcome-complete", "1"); } catch { /* Root state remains the fallback. */ }
    }
    const navigation = window.RaymondovichNavigation;
    if (!navigation) return;
    navigation.navigateRoute(result.route);
    if (result.screen) navigation.navigateScreen(result.screen, result.data || {});
  });

  root.addEventListener("keydown", event => {
    const panel = panelFor(root);
    if (event.key === "Tab" && panel && !panel.hidden) {
      const focusable = [...panel.querySelectorAll("input,button:not([disabled]),[tabindex]:not([tabindex=\"-1\"])")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }
    if (event.key === "Escape" && panel && !panel.hidden) {
      event.preventDefault();
      closeSearch();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.key === "/" && !event.metaKey && !event.ctrlKey
      && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
      && !document.activeElement?.isContentEditable) {
      event.preventDefault();
      openSearch();
    }
  });

  root.addEventListener("touchstart", event => {
    if (panelFor(root)?.hidden === false || event.touches.length !== 1) return;
    if ((document.scrollingElement?.scrollTop || window.scrollY || 0) > 0) return;
    const touch = event.changedTouches[0];
    if (!touch || touch.clientY > TOP_EDGE_START) return;
    if (event.target.closest("input,textarea,select,button,a,[contenteditable='true']")) return;
    gesture = { startX: touch.clientX, startY: touch.clientY };
  }, { capture: true, passive: true });

  root.addEventListener("touchmove", event => {
    if (!gesture || event.touches.length !== 1) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
      gesture = null;
      root.removeAttribute("data-global-search-pulling");
      root.removeAttribute("data-global-search-pull-ready");
      return;
    }
    if (deltaY > 6) {
      event.preventDefault();
      root.setAttribute("data-global-search-pulling", "true");
      if (deltaY >= PULL_THRESHOLD) root.setAttribute("data-global-search-pull-ready", "true");
      else root.removeAttribute("data-global-search-pull-ready");
    }
  }, { capture: true, passive: false });

  root.addEventListener("touchend", event => {
    if (!gesture) return;
    const touch = event.changedTouches[0];
    const distance = touch ? touch.clientY - gesture.startY : 0;
    gesture = null;
    root.removeAttribute("data-global-search-pulling");
    root.removeAttribute("data-global-search-pull-ready");
    if (distance >= PULL_THRESHOLD) openSearch();
  }, { capture: true, passive: true });

  root.addEventListener("touchcancel", () => {
    gesture = null;
    root.removeAttribute("data-global-search-pulling");
    root.removeAttribute("data-global-search-pull-ready");
  }, { capture: true, passive: true });
}
