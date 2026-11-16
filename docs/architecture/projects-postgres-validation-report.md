# Projects core SQL — PostgreSQL validation report

**Version:** 1.7.0  
**Created:** 2026-11-16  
**Status:** PostgreSQL 17.11 and isolated PostgREST 14.17 tests passed; hosted Supabase integration pending

## Scope

Validated the SQL draft at `docs/architecture/sql-drafts/projects-001-core-schema.sql` using an ephemeral PostgreSQL 17.11 service container in GitHub Actions.

The test database was disposable. It used a minimal compatibility fixture containing:
- roles `anon` and `authenticated`;
- schema `auth`;
- synthetic `auth.users(id uuid primary key)`.

No live Supabase project was connected, and no real user data was used.

## Runs

- [Core SQL execution and first integrity suite — successful](https://github.com/raymondovich-cloud/r.ru-Development/actions/runs/43814014601)
- [Expanded integrity suite — successful](https://github.com/raymondovich-cloud/r.ru-Development/actions/runs/43814119385)

## Verified results

| Validation | Result |
|---|---|
| SQL draft applies and commits on PostgreSQL 17.11 | PASS |
| Eight expected core tables created | PASS |
| RLS enabled on all eight tables | PASS |
| Six system roles seeded | PASS |
| Twenty permissions seeded | PASS |
| Fifty-four role-permission mappings seeded | PASS |
| No schema/table privileges for anon/authenticated | PASS |
| Parent-child owner equality enforced | PASS |
| Owner update cascades through three tested hierarchy levels | PASS |
| Role scope must match parent/child project scope | PASS |
| Custom role cannot be assigned outside its project | PASS |
| Owner cannot be inserted as a membership | PASS |
| Invalid project type rejected | PASS |
| Inconsistent archive state rejected | PASS |
| New visibility row defaults to private and hidden | PASS |
| Auth user deletion blocked when referenced as project owner/member | PASS |
| Parent deletion blocked while child projects exist | PASS |

## What this does not prove

This is a genuine PostgreSQL execution test, but not a full Supabase local-stack test. The compatibility fixture does not reproduce:
- Supabase Auth internals and all Auth columns/triggers;
- PostgREST schema exposure and function routing;
- Supabase JWT claim propagation and actual RLS request context;
- Supabase-managed role attributes and default grants;
- RPC wrappers, SECURITY DEFINER execution and privilege boundaries;
- invitation, publication, resource-sharing and ownership-transfer workflows, which are not part of this first core SQL draft.

These remain required before promoting the draft to a real migration or applying it to any Supabase environment.

## Current deployment status

- SQL draft: validated on PostgreSQL 17.11 in disposable CI.
- Supabase CLI migration: not generated yet.
- Connected Supabase database: unchanged.
- Production: unchanged.


## Primary Supabase deployment

On 2026-11-16, at the user's explicit direction, the same core schema was applied to the primary Raymondovich Supabase project `yajybgdorhxebbigwjgi` (PostgreSQL 17.11, eu-central-1).

Supabase migration history records version `20261116060455`, name `projects_001_core_schema`.

Live post-apply checks passed:
- 8/8 tables present; 8/8 have RLS enabled.
- 6 system roles, 20 permissions, 54 role-permission mappings.
- 4 active project component types.
- No `anon` or `authenticated` schema USAGE or direct SELECT on `projects.projects`.
- No project or membership records created.
- Auth users and profiles remain at 2 each.
- Existing Auth/private trigger count remains 3.
- `projects` not configured for PostgREST exposure at the time of verification.

The Security Advisor reports eight additional INFO notices for the new tables having RLS enabled with no policies. This is deliberate default-deny until the RPC authorization layer is implemented. Do not resolve these by adding broad policies or client grants.

This is a core-schema deployment only. The remaining RPCs and application workflows are not deployed.


## Projects RPC phase 1 — updated review state (2026-11-16)

The development migration was revised after compatibility review of the primary PostgreSQL 17.11 core schema:

- Added `projects.project_components` with backfill from the legacy scalar component reference.
- Changed project creation to accept an array of component codes and validate multi-component combinations.
- Made all five public RPC functions `SECURITY INVOKER` wrappers.
- Moved privileged implementations into the unexposed `projects` schema as narrowly granted `SECURITY DEFINER` functions.
- Added explicit revocation of default execution privileges on internal functions and explicit authenticated grants.
- Expanded the test suite to assert wrapper and implementation security modes, grants, schema USAGE and multi-component persistence.

**Validation status:** The revised migration and test changes are committed in the development repository. Their PostgreSQL 17.11 CI run has not yet been confirmed in this report. Do not treat the earlier successful run for migration version 1.0.4 as validation of the revised SQL. Primary Supabase remains unchanged by this work.


## RPC phase 1 — final PostgreSQL 17.11 CI verification (2026-11-16)

**Result: PASS.** GitHub Actions run [#31](https://github.com/raymondovich-cloud/r.ru-Development/actions/runs/43817425318) completed successfully against PostgreSQL 17.11 after the final migration, draft and test version bumps. Job `postgres-validation` completed all stages: Auth compatibility fixture, core schema apply/test, RPC phase 1 migration apply, and RPC phase 1 tests.

The SQL test emitted: `PASS: five invoker RPCs, isolated definer implementations, multi-component projects, ownership, permissions, deny precedence, suspension, private defaults, audit immutability, archive/restore and grants`.

The final test suite also verifies that internal helper functions (`lock_hierarchy`, `has_permission`) are not directly executable by `authenticated` or `anon`. This final run covers migration version 1.2.0 and test version 1.3.0.

**Scope limitation:** this is an ephemeral PostgreSQL 17.11 CI validation with a minimal Supabase Auth compatibility fixture. It is not a full Supabase integration test and is not proof of a successful deployment to the primary Supabase project. Primary Supabase has not been modified.


## CI validation completed — 2026-11-16

The revised migration and test suite passed in GitHub Actions:

- Run: `43817425318` — success.
- Job: `postgres-validation` (`133132540239`) — success.
- Tested commit: `8eef9f64e8b607eca0423cfc4673de598afb1d32`.
- PostgreSQL: 17.11, ephemeral CI database, minimal Supabase Auth compatibility fixture.
- Core schema migration and tests: PASS.
- RPC phase-1 migration and tests: PASS.
- RPC assertions cover five SECURITY INVOKER public wrappers, isolated SECURITY DEFINER implementations, multi-component projects, ownership and permission evaluation, deny precedence, suspension, private defaults, immutable audit records, archive/restore and grants.

**Scope limitation:** this is a PostgreSQL migration/test CI run, not a full Supabase Auth + PostgREST + API integration test. The migration remains unapplied to primary Supabase pending separate explicit approval.


## PostgREST HTTP integration — PASS (2026-11-16)

- Run: `43818747946` — success.
- Commit: `c804500c2a72b263fcdfc9e734c19c97b22d81e1`.
- API layer: PostgREST v14.17.
- Database: ephemeral PostgreSQL 17.11.
- Authentication: synthetic HS256 JWTs for test identities.
- Authenticated project creation, owner access check, outsider update denial, anonymous RPC denial, private schema isolation and normalized multi-component persistence all passed.

The test fixture's `auth.uid()` now supports both the legacy individual claim setting and the modern `request.jwt.claims` JSON setting used by PostgREST v14.

This is not a live hosted Supabase Auth/PostgREST test. Primary Supabase has not been modified and the RPC migration remains unapplied there.


## Hosted Supabase read-only preflight — 2026-11-16

Primary project read-only verification confirms the live `auth.uid()` implementation supports both legacy and aggregate JWT claim settings. RPC Phase 1 and the normalized component table remain absent from primary. The `projects` schema has no USAGE granted to `anon` or `authenticated` at this stage.

No hosted changes were applied. A live REST call using a token issued by hosted Supabase Auth remains untested; the available connector does not provide a user session token or arbitrary authenticated REST request facility. The local PostgREST integration test uses synthetic JWTs and is not represented as a hosted end-to-end test.


## Final hosted preflight and API CI boundary — 2026-11-16

The latest CI run [43818747946](https://github.com/raymondovich-cloud/r.ru-Development/actions/runs/43818747946) passed in full. The run applied the Projects core and RPC migrations to an ephemeral PostgreSQL 17.11 database, then exercised the five public RPCs through PostgREST v14.17 using synthetic JWTs. The HTTP assertions passed for authenticated project creation, owner access, outsider denial, anonymous denial, private-schema isolation and multi-component persistence.

A fresh read-only query against the primary Supabase project confirmed:
- RPC Phase 1 functions are not installed.
- `projects.project_components` and `projects.project_audit_logs` are not installed.
- `anon` and `authenticated` have no USAGE on the `projects` schema.
- Migration history contains Projects Core Schema only (`20261116060455`).
- No changes were made to the hosted database.

A live hosted PostgREST test cannot run until the RPC migration exists in that environment. A Supabase development branch is a viable isolated option, but branch compute may incur hourly and other usage charges; do not create one without first disclosing the cost and obtaining the user's agreement.

**Deployment boundary:** the new RPC migration remains unapplied to primary Supabase. Local/CI PostgREST success is not equivalent to hosted Supabase Auth + PostgREST verification.
