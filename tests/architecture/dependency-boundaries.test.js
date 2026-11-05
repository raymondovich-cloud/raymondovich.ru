import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../source/", import.meta.url));

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(js|vue)$/.test(entry.name)) files.push(path);
  }
  return files;
}

async function contents(directory) {
  const files = await sourceFiles(typeof directory === "string" ? directory : fileURLToPath(directory));
  return Promise.all(files.map(async (path) => ({
    path,
    content: await readFile(path, "utf8"),
  })));
}

async function designFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await designFiles(path));
    else if (/\.(css|js|vue)$/.test(entry.name)) files.push(path);
  }
  return files;
}

test("Domain has no dependencies on outer application layers or runtime frameworks", async () => {
  const files = await contents(join(root, "domain"));
  for (const file of files) {
    assert.doesNotMatch(
      file.content,
      /from\s+["'][^"']*(?:application|presentation|infrastructure|supabase|vue|@supabase)[^"']*["']/,
      file.path,
    );
  }
});

test("Application does not depend on Infrastructure, Supabase SDK, Vue or browser globals", async () => {
  const files = await contents(join(root, "application"));
  for (const file of files) {
    assert.doesNotMatch(
      file.content,
      /from\s+["'][^"']*(?:infrastructure|supabase|@supabase|vue)[^"']*["']/,
      file.path,
    );
    assert.doesNotMatch(
      file.content,
      /\b(?:window|document|localStorage|sessionStorage)\b/,
      file.path,
    );
  }
});

test("SPA views do not import Infrastructure internals directly", async () => {
  const files = await contents(join(root, "presentation", "spa"));
  for (const file of files) {
    assert.doesNotMatch(
      file.content,
      /from\s+["'][^"']*infrastructure\//,
      file.path,
    );
  }
});

test("Design System remains independent from business layers and UI frameworks", async () => {
  const files = await designFiles(join(root, "design"));
  for (const path of files) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(
      source,
      /(?:from\s*|@import\s*)["'][^"']*(?:domain|application|infrastructure|supabase|presentation\/runtime)[^"']*["']/,
      path,
    );
    assert.doesNotMatch(
      source,
      /from\s*["'](?:vue|vue-router|@vue\/)[^"']*["']/,
      path,
    );
  }

  const tokens = await readFile(join(root, "design", "tokens.css"), "utf8");
  assert.match(tokens, /--rv-color-public-background:\s*#/);
  assert.match(tokens, /--rv-color-owner-accent:\s*#/);
});

test("Every shared Design token reference is declared and loaded before SPA styles", async () => {
  const designRoot = join(root, "design");
  const files = await designFiles(designRoot);
  const sources = await Promise.all(files.map((path) => readFile(path, "utf8")));
  const tokens = await readFile(join(designRoot, "tokens.css"), "utf8");
  const declared = new Set(
    [...tokens.matchAll(/(--rv-[\w-]+)\s*:/g)].map((match) => match[1]),
  );

  for (const source of sources) {
    for (const match of source.matchAll(/var\((--rv-[\w-]+)/g)) {
      assert.ok(declared.has(match[1]), "Undeclared Design token: " + match[1]);
    }
  }

  const entry = await readFile(join(root, "presentation", "spa", "main.js"), "utf8");
  const tokensImport = entry.indexOf("../../design/tokens.css");
  const spaImport = entry.indexOf("../../design/spa.css");
  assert.ok(tokensImport >= 0, "tokens.css must be imported by the SPA entry");
  assert.ok(spaImport >= 0, "spa.css must be imported by the SPA entry");
  assert.ok(tokensImport < spaImport, "tokens.css must load before global SPA styles");
});
