// version 1.1
const route = document.body.dataset.spaRoute || "";
const search = window.location.search || "";
const legacyHash = window.location.hash || "";

if (route) {
  window.location.replace(`/#${route}${search}${legacyHash}`);
} else {
  window.location.replace(`/${search}${legacyHash || "#/"}`);
}
