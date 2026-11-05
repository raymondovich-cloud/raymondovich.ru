import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const migrationsDirectory = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));
const expectedMigrations = [
  "20261008184130_create_user_profiles_rls.sql",
  "20261008184746_temporary_promote_admin.sql",
  "20261008185014_lock_temporary_admin_function.sql",
  "20261008195529_create_project_management.sql",
  "20261009132459_create_ecosystem_tools_registry.sql",
  "20261009132738_seed_ecosystem_tools_initial_inventory.sql",
  "20261009133334_restrict_ecosystem_tools_grants.sql",
  "20261009140217_reconcile_ecosystem_tool_inventory.sql",
  "20261009140350_link_lifegame_to_domain_provider.sql",
  "20261009143602_add_project_pinning.sql",
  "20261104131912_extend_projects_for_idea_inbox.sql",
  "20261104144433_split_ideas_and_projects.sql",
  "20261104185802_extend_ideas_with_optional_planning_details.sql",
  "20261104192000_extend_idea_planning_revenue_and_concept.sql",
];

async function migration(name) {
  return readFile(join(migrationsDirectory, name), "utf8");
}

test("repository migration inventory matches the audited 14-version history", async () => {
  const actual = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual(actual, [...expectedMigrations].sort());
  const versions = actual.map((name) => name.slice(0, 14));
  assert.equal(new Set(versions).size, versions.length, "Migration versions must be unique");
  assert.ok(versions.every((version) => /^\d{14}$/.test(version)), "Every migration must use a 14-digit timestamp");
});

test("historical admin promotion function is locked away from untrusted roles", async () => {
  const createFunction = await migration("20261008184746_temporary_promote_admin.sql");
  const lockFunction = await migration("20261008185014_lock_temporary_admin_function.sql");
  assert.match(createFunction, /security definer/i);
  assert.match(lockFunction, /revoke execute on function public\.promote_raymondovich_admin\(text\) from public, anon, authenticated/i);
});

test("project management migration enables RLS and avoids anonymous table grants", async () => {
  const sql = await migration("20261008195529_create_project_management.sql");
  assert.match(sql, /alter table public\.projects enable row level security/i);
  assert.match(sql, /revoke all on table public\.projects[\s\S]*?from anon, authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on public\.projects[\s\S]*?to authenticated/i);
});

test("historical seed migration retains both Raymondovich project records", async () => {
  const sql = await migration("20261009132738_seed_ecosystem_tools_initial_inventory.sql");
  assert.match(sql, /'Raymondovich\.ru'/);
  assert.match(sql, /'Raymondovich\.online'/);
});

test("planning migration keeps its explicit transaction boundary", async () => {
  const sql = await migration("20261104185802_extend_ideas_with_optional_planning_details.sql");
  assert.match(sql, /^\s*(?:--[^\n]*\n\s*)*begin;/i);
  assert.match(sql, /commit;\s*$/i);
});

test("migration history contains no destructive table drops or truncations", async () => {
  const files = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql"));
  for (const name of files) {
    const sql = await migration(name);
    assert.doesNotMatch(sql, /\bdrop\s+table\b|\btruncate\s+(?:table\s+)?/i, `Unexpected destructive DDL in ${name}`);
  }
});
