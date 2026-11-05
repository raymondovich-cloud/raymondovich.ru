// version 1.0
const route = document.body.dataset.spaRoute || "";
const legacyHash = window.location.hash || "";
const destinationHash = route ? `#${route}${legacyHash}` : (legacyHash || "#/");
window.location.replace(`/${window.location.search}${destinationHash}`);
