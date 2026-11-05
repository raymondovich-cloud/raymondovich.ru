// version 1.0
// Preserve legacy root anchor URLs such as /#private while using Vue Router Hash History.
const legacyHash = window.location.hash;
if (legacyHash && !legacyHash.startsWith("#/")) {
  const nextUrl = `${window.location.pathname}${window.location.search}#/${legacyHash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}
