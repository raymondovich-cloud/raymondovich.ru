// version 1.1
const route = document.body.dataset.spaRoute || "";
const search = window.location.search || "";
const legacyHash = window.location.hash || "";

const destinationHash = route
  ? `#${route}${search}${legacyHash}`
  : legacyHash.startsWith("#/")
    ? `${legacyHash}${search}`
    : `#/${search}${legacyHash}`;

window.location.replace(`/${destinationHash}`);
