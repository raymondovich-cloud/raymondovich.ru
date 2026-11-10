import "/source/platform/bootstrap.js";

const main = document.querySelector("#main");
const homeMarkup = main?.innerHTML ?? "";

const routes = {
  "ecosystem-projects": "/source/presentation/public/pages/ecosystem-projects.html",
  "partner-projects": "/source/presentation/public/pages/ecosystem-projects.html",
  "advertising-projects": "/source/presentation/public/pages/ecosystem-projects.html",
  "how-to-join": "/source/presentation/public/pages/how-to-join.html",
  "settings": "/source/presentation/public/pages/settings.html",
  "help": "/source/presentation/public/pages/help.html",
  "plans": "/source/presentation/public/pages/plans.html",
  "authorization": "/source/presentation/public/pages/authorization.html",
  "apply": "/source/presentation/public/pages/apply.html",
  "apply-test": "/source/presentation/public/pages/apply-test.html",
  "privacy": "/source/presentation/public/pages/privacy.html"
};

const legacyPaths = {
  "ecosystem-projects": "/source/presentation/public/pages/ecosystem-projects.html",
  "partner-projects": "/source/presentation/public/pages/partner-projects.html",
  "advertising-projects": "/source/presentation/public/pages/advertising-projects.html",
  "how-to-join": "/source/presentation/public/pages/how-to-join.html",
  "settings": "/source/presentation/public/pages/settings.html",
  "help": "/source/presentation/public/pages/help.html",
  "plans": "/source/presentation/public/pages/plans.html",
  "authorization": "/source/presentation/public/pages/authorization.html"
};
const legacySlug = Object.keys(legacyPaths).find((slug) => location.pathname === legacyPaths[slug]);
if (legacySlug) {
  location.replace(`/#${legacySlug}`);
} else {
  let renderSequence = 0;
  let renderedRoute = null;
  let renderedPageSlug = null;

  function updateNavigation(slug) {
    const activeSlug = ["partner-projects", "advertising-projects"].includes(slug)
      ? "ecosystem-projects"
      : slug;
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      const target = new URL(link.href, location.origin);
      const targetSlug = target.hash.slice(1);
      const isActive = activeSlug === "home"
        ? target.pathname === "/" && !targetSlug
        : targetSlug === activeSlug;
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  async function renderRoute(route = location.hash || "home") {
    if (!main) return;
    if (window.RaymondovichPinGuard?.ready) {
      await window.RaymondovichPinGuard.ready;
    }
    const slug = route === "/" ? "home" : route.replace(/^#/, "") || "home";
    const routeSlug = slug.startsWith("authorization/") ? "authorization" : slug;
    if (routeSlug === renderedPageSlug) {
      renderedRoute = route;
      renderedPageSlug = routeSlug;
      updateNavigation(routeSlug);
      return;
    }
    const sequence = ++renderSequence;
    main.setAttribute("aria-busy", "true");

    try {
      if (routeSlug === "home") {
        main.innerHTML = homeMarkup;
        document.title = "RAYMONDOVICH — цифровая экосистема";
      } else {
        const path = routes[routeSlug];
        if (!path) throw new Error("Страница не найдена");
        const response = await fetch(path, { headers: { Accept: "text/html" } });
        if (!response.ok) throw new Error(`Не удалось загрузить страницу (${response.status})`);
        const html = await response.text();
        const page = new DOMParser().parseFromString(html, "text/html");
        const pageMain = page.querySelector("#main");
        if (!pageMain) throw new Error("В документе отсутствует основной контент");
        if (sequence !== renderSequence) return;
        main.innerHTML = pageMain.innerHTML;
        const routeTitles = {
          apply: "Заявка — RAYMONDOVICH",
          "apply-test": "Тест Intake — RAYMONDOVICH",
          privacy: "Обработка персональных данных — RAYMONDOVICH"
        };
        document.title = page.title || routeTitles[routeSlug] || "RAYMONDOVICH";
        const description = page.querySelector('meta[name="description"]')?.content;
        const descriptionTag = document.querySelector('meta[name="description"]');
        if (description && descriptionTag) descriptionTag.content = description;
      }
      if (sequence !== renderSequence) return;
      renderedRoute = route;
      updateNavigation(routeSlug);
      document.body.classList.remove("menu-open");
      window.scrollTo({ top: 0, behavior: "auto" });
      const productSection = {
        "partner-projects": "partner-development",
        "advertising-projects": "independent-products"
      }[routeSlug];
      if (productSection) {
        document.getElementById(productSection)?.scrollIntoView({ behavior: "auto", block: "start" });
      }
      main.focus({ preventScroll: true });
    } catch (error) {
      if (sequence !== renderSequence) return;
      main.innerHTML = `<section class="section"><div class="page-intro"><p class="overline">PAGE ERROR</p><h1>Не удалось открыть страницу</h1><p>${String(error.message || "Неизвестная ошибка")}</p><a class="button secondary" href="/">Вернуться на главную</a></div></section>`;
    } finally {
      if (sequence === renderSequence) main.removeAttribute("aria-busy");
    }
  }

  document.addEventListener("raymondovich:navigation", (event) => {
    const route = event.detail?.route || location.hash || "/";
    if (route !== renderedRoute) renderRoute(route);
  });

  renderRoute(window.RaymondovichNavigation?.getState()?.route || location.hash || "/");
}
