import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
