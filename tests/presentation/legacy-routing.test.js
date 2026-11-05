import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const redirectSource = await readFile(new URL("../../source/presentation/legacy/redirect-to-spa.js", import.meta.url), "utf8");
const hashCompatSource = await readFile(new URL("../../source/presentation/spa/legacy-hash-compat.js", import.meta.url), "utf8");

function redirect({ route, pathname, search = "", hash = "" }) {
  let destination = null;
  runInNewContext(redirectSource, {
    document: { body: { dataset: { spaRoute: route } } },
    window: { location: { pathname, search, hash, replace(value) { destination = value; } } },
  });
  return destination;
}

test("legacy public URLs hand off to the matching SPA route", () => {
  assert.equal(
    redirect({ route: "/pages/products/products.html", pathname: "/pages/products/products.html" }),
    "/#/pages/products/products.html",
  );
});

test("legacy redirect preserves query strings and fragment anchors", () => {
  assert.equal(
    redirect({
      route: "/pages/products/products.html",
      pathname: "/pages/products/products.html",
      search: "?campaign=summer",
      hash: "#section",
    }),
    "/#/pages/products/products.html?campaign=summer#section",
  );
});

test("legacy root anchor URLs are normalized for Vue Router Hash History", () => {
  let replaced = null;
  runInNewContext(hashCompatSource, {
    window: {
      location: { pathname: "/", search: "", hash: "#private" },
      history: { state: null, replaceState(_state, _title, url) { replaced = url; } },
    },
  });
  assert.equal(replaced, "/#/#private");
});

test("already normalized router URLs remain unchanged", () => {
  let replaced = null;
  runInNewContext(hashCompatSource, {
    window: {
      location: { pathname: "/", search: "", hash: "#/owner" },
      history: { state: null, replaceState(_state, _title, url) { replaced = url; } },
    },
  });
  assert.equal(replaced, null);
});
