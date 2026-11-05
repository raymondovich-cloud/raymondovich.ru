// version 1.0
const navigation = document.querySelector(".side-body");

if (navigation) {
  const routeLinks = [...navigation.querySelectorAll('a.side-home[href]')];
  const expandableSections = [...navigation.querySelectorAll("details.p, details.faq-sidebar")];

  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  const currentRouteLink = routeLinks.find((link) => {
    const linkPath = new URL(link.href, window.location.origin).pathname.replace(/\/$/, "") || "/";
    return linkPath === currentPath;
  });

  const restoreCurrentRoute = () => {
    routeLinks.forEach((link) => link.removeAttribute("aria-current"));
    if (currentRouteLink) currentRouteLink.setAttribute("aria-current", "page");
  };

  expandableSections.forEach((section) => {
    section.addEventListener("toggle", () => {
      if (section.open) {
        expandableSections.forEach((other) => {
          if (other !== section) other.open = false;
        });
        routeLinks.forEach((link) => link.removeAttribute("aria-current"));
      } else if (!expandableSections.some((other) => other.open)) {
        restoreCurrentRoute();
      }
    });
  });

  navigation.addEventListener("click", (event) => {
    const routeLink = event.target.closest("a.side-home[href]");
    if (!routeLink) return;
    expandableSections.forEach((section) => { section.open = false; });
  });

  restoreCurrentRoute();
}
