import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)), "dist");

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  assert.ok(existsSync(absolutePath), `Missing build output: ${relativePath}`);
  return readFileSync(absolutePath, "utf8");
}

const index = read("index.html");
assert.match(index, /<div id="app"><\/div>/, "Root entry must mount the Vue SPA");
assert.match(index, /type="module"[^>]+src="[^"]+\.js"/, "Root entry must load a bundled module");

const legacyRoutes = {
  "pages/about/about.html": "/pages/about/about.html",
  "pages/products/products.html": "/pages/products/products.html",
  "pages/cooperation/cooperation.html": "/pages/cooperation/cooperation.html",
  "pages/profile/profile.html": "/pages/profile/profile.html",
  "pages/settings/settings.html": "/pages/settings/settings.html",
  "pages/account/app.html": "/pages/account/app.html",
  "pages/auth/auth.html": "/pages/auth/auth.html",
  "pages/auth/register.html": "/pages/auth/register.html",
  "pages/auth/reset-password.html": "/pages/auth/reset-password.html",
  "pages/legal/cookies.html": "/pages/legal/cookies.html",
  "pages/legal/privacy.html": "/pages/legal/privacy.html",
  "pages/legal/terms.html": "/pages/legal/terms.html",
  "pages/legal/private-conditions.html": "/pages/legal/private-conditions.html",
};

for (const [file, route] of Object.entries(legacyRoutes)) {
  const html = read(file);
  assert.ok(html.includes(`data-spa-route="${route}"`), `${file} must preserve its legacy route mapping`);
  assert.match(html, /type="module"[^>]+src="[^"]+\.js"/, `${file} must load the SPA redirect module`);
}

const callback = read("pages/auth/auth-callback.html");
assert.match(callback, /src="[^"]*authCallback-[^"]+\.js"/, "Auth callback must retain its token-exchange bridge");

const passwordRecovery = read("pages/auth/update-password.html");
assert.match(passwordRecovery, /src="[^"]*updatePassword-[^"]+\.js"/, "Password recovery must retain its legacy token-fragment bridge");

const preview = read("spa.html");
assert.match(preview, /noindex,nofollow/i, "The separate SPA preview entry must remain non-indexable");

console.log("SPA build smoke checks passed.");
