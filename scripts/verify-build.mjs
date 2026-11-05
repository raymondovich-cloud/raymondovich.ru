import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = resolve(repositoryRoot, "dist");

function readSource(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), "utf8");
}

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = resolve(directory, name);
    return statSync(absolute).isDirectory()
      ? sourceFiles(absolute)
      : absolute.endsWith(".js") || absolute.endsWith(".vue") ? [absolute] : [];
  });
}

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  assert.ok(existsSync(absolutePath), `Missing build output: ${relativePath}`);
  return readFileSync(absolutePath, "utf8");
}

function htmlFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = resolve(directory, name);
    return statSync(absolute).isDirectory()
      ? htmlFiles(absolute)
      : absolute.endsWith(".html") ? [absolute] : [];
  });
}


assert.equal(read("robots.txt"), readSource("public/robots.txt"), "Vite output must include the canonical robots.txt");
assert.equal(read("sitemap.xml"), readSource("public/sitemap.xml"), "Vite output must include the canonical sitemap.xml");

for (const file of htmlFiles(root)) {
  const html = readFileSync(file, "utf8");
  assert.doesNotMatch(html, /<style\b/i, \`Built HTML must not contain inline CSS: \${file}\`);
  assert.doesNotMatch(html, /\sstyle\s*=/i, \`Built HTML must not contain style attributes: \${file}\`);

  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  for (const tag of scriptTags) {
    if (/type=["']application\/ld\+json["']/i.test(tag)) continue;
    assert.match(tag, /\bsrc\s*=/i, \`Built HTML must not contain inline JavaScript: \${file}\`);
  }
}

const index = read("index.html");
assert.match(index, /<div id="app"><\/div>/, "Root entry must mount the Vue SPA");
assert.match(index, /type="module"[^>]+src="[^"]+\.js"/, "Root entry must load a bundled module");
assert.doesNotMatch(index, /(?:auth|supabase)[^"]*\.js/i, "Public root entry must not eagerly load the Supabase authentication bundle");

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

const spaMain = readSource("source/presentation/spa/main.js");
const legacyHashCompat = readSource("source/presentation/spa/legacy-hash-compat.js");
assert.ok(spaMain.indexOf("legacy-hash-compat.js") < spaMain.indexOf("router/routes.js"), "Legacy hash normalization must run before router creation");
assert.match(legacyHashCompat, /!legacyHash\.startsWith\("#\/"\)/, "Legacy anchor hashes must be normalized for Hash History");

const routes = readSource("source/presentation/spa/router/routes.js");
for (const requiredRoute of ["/", "/products", "/cooperation", "/about", "/profile", "/settings", "/legal/:slug", "/auth/login", "/auth/register", "/auth/reset-password", "/auth/callback", "/owner", "/owner/ideas", "/owner/projects", "/partner", "/external/:projectId"]) {
  assert.ok(routes.includes(`path: "${requiredRoute}"`), `Missing SPA route: ${requiredRoute}`);
}
assert.match(routes, /getRole\(session\) !== "admin"/, "Owner route must reject non-admin sessions");

const ownerView = readSource("source/presentation/spa/views/owner/OwnerOverview.vue");
for (const action of ["createIdea", "updateIdea", "deleteIdea", "createProjectFromIdea", "updateProject", "deleteProject", "launch", "review", "priority", "archive", "restore", "pin", "pause", "complete"]) {
  assert.ok(ownerView.includes(action), `Owner workspace is missing expected action: ${action}`);
}

for (const file of sourceFiles(resolve(repositoryRoot, "source/domain"))) {
  const content = readFileSync(file, "utf8");
  assert.doesNotMatch(content, /@supabase\/supabase-js|(?:application|infrastructure|presentation)\//, `Domain must remain independent: ${file}`);
}

for (const file of sourceFiles(resolve(repositoryRoot, "source/application"))) {
  const content = readFileSync(file, "utf8");
  assert.doesNotMatch(content, /@supabase\/supabase-js|infrastructure\/supabase|presentation\//, `Application must depend on ports, not infrastructure or presentation: ${file}`);
}

for (const file of sourceFiles(resolve(repositoryRoot, "source/presentation"))) {
  if (file.includes("/runtime/")) continue;
  const content = readFileSync(file, "utf8");
  assert.doesNotMatch(content, /@supabase\/supabase-js|infrastructure\/supabase/, `Presentation modules must use the runtime composition boundary: ${file}`);
  assert.doesNotMatch(content, /:style\s*=/, `Presentation must keep styling in CSS files: ${file}`);
}

const preview = read("spa.html");
assert.match(preview, /noindex,nofollow/i, "The separate SPA preview entry must remain non-indexable");

const robots = read("robots.txt");
const sitemap = read("sitemap.xml");
assert.ok(robots.startsWith("User-agent: *"), "Built robots.txt must be copied from the public directory");
assert.ok(robots.includes("Sitemap: https://raymondovich.ru/sitemap.xml"), "robots.txt must point to the canonical sitemap");
assert.ok(sitemap.includes("<urlset") && sitemap.includes("http://www.sitemaps.org/schemas/sitemap/0.9"), "Built sitemap.xml must contain the sitemap namespace");
assert.ok(sitemap.includes("<loc>https://raymondovich.ru/</loc>"), "Sitemap must include the canonical homepage");
assert.equal(readSource("public/robots.txt"), readSource("robots.txt"), "Root and Vite public robots.txt copies must stay synchronized");
assert.equal(readSource("public/sitemap.xml"), readSource("sitemap.xml"), "Root and Vite public sitemap.xml copies must stay synchronized");

console.log("SPA build smoke checks passed.");
