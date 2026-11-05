import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../../source/presentation/spa/router/routes.js", import.meta.url), "utf8");
const ownerView = await readFile(new URL("../../source/presentation/spa/views/owner/OwnerOverview.vue", import.meta.url), "utf8");

test("Owner Control Center sections have stable protected routes", () => {
  for (const [path, name] of [
    ["/owner", "owner-overview"],
    ["/owner/ideas", "owner-ideas"],
    ["/owner/projects", "owner-projects"],
  ]) {
    assert.match(routes, new RegExp(`path: ["']${path.replaceAll("/", "\\/")}["']`));
    assert.match(routes, new RegExp(`name: ["']${name}["']`));
  }

  assert.match(routes, /alias: ["']\/pages\/account\/app\.html["']/);
  assert.match(routes, /meta: \{ space: "owner", layout: "standalone", requiresAuth: true/);
  assert.match(routes, /to\.meta\.space === "owner" && getRole\(session\) !== "admin"/);
});

test("Owner Control Center view state follows router history instead of local-only state", () => {
  assert.match(ownerView, /const view = computed\(\(\) => \(\{ "owner-ideas": "ideas", "owner-projects": "projects" \}\)\[route\.name\] \|\| "overview"\)/);
  assert.match(ownerView, /router\.push\(\{ name: routeName \}\)/);
  assert.doesNotMatch(ownerView, /view\.value\s*=/);
});
