const main = document.querySelector("#main");
const homeMarkup = main?.innerHTML ?? "";

const routes = {
  "ecosystem-projects": "/source/presentation/public/pages/ecosystem-projects.html",
  "partner-projects": "/source/presentation/public/pages/partner-projects.html",
  "advertising-projects": "/source/presentation/public/pages/advertising-projects.html",
  "how-to-join": "/source/presentation/public/pages/how-to-join.html",
  "settings": "/source/presentation/public/pages/settings.html",
  "help": "/source/presentation/public/pages/help.html",
  "plans": "/source/presentation/public/pages/plans.html",
  "authorization": "/source/presentation/public/pages/authorization.html"
};

const legacySlug = Object.keys(routes).find((slug) => location.pathname === routes[slug]);
if (legacySlug) {
  location.replace(`/#${legacySlug}`);
} else {
  let renderSequence = 0;

  function updateNavigation(slug) {
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      const target = new URL(link.href, location.origin);
      const targetSlug = target.hash.slice(1);
      const isActive = slug === "home"
        ? target.pathname === "/" && !targetSlug
        : targetSlug === slug;
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  async function renderRoute() {
    if (!main) return;
    if (window.RaymondovichPinGuard?.ready) {
      await window.RaymondovichPinGuard.ready;
    }
    const slug = location.hash.slice(1) || "home";
    const sequence = ++renderSequence;
    main.setAttribute("aria-busy", "true");

    try {
      if (slug === "home") {
        main.innerHTML = homeMarkup;
        document.title = "RAYMONDOVICH — цифровая экосистема";
      } else {
        const path = routes[slug];
        if (!path) throw new Error("Страница не найдена");
        const response = await fetch(path, { headers: { Accept: "text/html" } });
        if (!response.ok) throw new Error(`Не удалось загрузить страницу (${response.status})`);
        const html = await response.text();
        const page = new DOMParser().parseFromString(html, "text/html");
        const pageMain = page.querySelector("#main");
        if (!pageMain) throw new Error("В документе отсутствует основной контент");
        if (sequence !== renderSequence) return;
        main.innerHTML = pageMain.innerHTML;
        document.title = page.title || "RAYMONDOVICH";
        const description = page.querySelector('meta[name="description"]')?.content;
        let descriptionTag = document.querySelector('meta[name="description"]');
        if (description && descriptionTag) descriptionTag.content = description;
      }
      updateNavigation(slug);
      document.body.classList.remove("menu-open");
      window.scrollTo({ top: 0, behavior: "auto" });
      main.focus({ preventScroll: true });
    } catch (error) {
      if (sequence !== renderSequence) return;
      main.innerHTML = `<section class="section"><div class="page-intro"><p class="overline">PAGE ERROR</p><h1>Не удалось открыть страницу</h1><p>${error.message}</p><a class="button secondary" href="/">Вернуться на главную</a></div></section>`;
    } finally {
      if (sequence === renderSequence) main.removeAttribute("aria-busy");
    }
  }

  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
