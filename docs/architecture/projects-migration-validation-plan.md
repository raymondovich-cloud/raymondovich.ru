# Projects — migration validation plan

**Version:** 1.8.0  
**Status:** PostgreSQL 17.11 and isolated PostgREST 14.17 CI passed; hosted RPC deployment not performed  
**Created:** 2026-11-16  
**Updated:** 2026-11-16  
**Target Supabase project:** `yajybgdorhxebbigwjgi`  
**Target PostgreSQL:** 17.11

## 1. Purpose and execution boundary

This plan describes how the approved Projects model will be converted into Supabase migrations and validated. The accompanying SQL is a review draft, not a Supabase CLI migration and must not be applied to the connected project.

When SQL is ready to enter the migration workflow, generate the real migration file using `supabase migration new <descriptive_name>`; do not invent timestamps or migration filenames.

## 2. Read-only live preflight (2026-11-16)

| Check | Result |
|---|---|
| PostgreSQL | 17.11 |
| `projects` schema | Absent |
| Projects/Tools tables in inspected application schemas | None |
| Profile source | `private.user_profiles` |
| Username | Existing immutable profile username; normalized uniqueness previously audited |
| `pgcrypto` | Installed in `extensions`, version 1.3 |
| Existing auth/profile functions | `private.assign_default_user_role`, `private.create_user_profile_after_signup`, `public.lookup_auth_user_for_username`, `public.profile_settings_get`, `public.profile_settings_update` |
| API exposed-schema setting | Not returned by DB setting inspection; verify in Dashboard before deployment |

Existing authentication triggers/functions are outside this subsystem. Do not replace or silently alter them.

Supabase's 2026 Data API changes mean new tables/functions may require explicit grants. The design keeps base tables in an unexposed `projects` schema and exposes only individually reviewed wrappers in `public`.

References:
- [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Data API auto-exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

## 3. Draft artifacts

`docs/architecture/sql-drafts/projects-001-core-schema.sql` contains the first-phase schema, catalogues, project/membership/role/grant/visibility tables, approved role-permission seeds, restrictive identity FKs, hierarchy owner equality, a role-scope integrity trigger and RLS default-deny.

It does not yet contain invitations, publication, profile listings, resource shares, ownership transfer, audit log, RPCs or public wrappers. Those require separate drafts.

## 4. Migration decomposition

| Phase | Responsibility | Validation |
|---|---|---|
| 001 | Core schema, catalogues, projects, memberships, roles, grants, visibility | FK invariants, seeds, default-deny |
| 002 | Authorization helpers and table-by-table RLS | Isolation, owner precedence, deny overrides |
| 003 | Invitations and notification outbox | Token lifecycle, email binding, retries |
| 004 | Publication and profile listings | Ancestor visibility, safe public DTO |
| 005 | Resource shares and Tools references | Same-hierarchy boundary, revocation isolation |
| 006 | Ownership transfer, archive/restore/delete, account-deletion preflight | Atomic tree transfer, blockers, concurrency |
| 007 | Public RPC wrappers and explicit grants | API boundary, EXECUTE allowlist, spoofing |
| 008 | Audit hardening and final indexes | Append-only audit, event coverage, query plans |

Adjust phase boundaries only when dependencies require it. Each migration must have one coherent responsibility and independently testable postconditions.

## 5. Local validation environment

1. Use a local Supabase stack pinned to a CLI version compatible with the repository and PostgreSQL 17.
2. Inspect `supabase --version`, `supabase --help` and `supabase migration --help`; CLI v3 changes local/hosted defaults.
3. Use a schema snapshot for the relevant Auth/profile dependencies or a disposable Supabase branch only after checking cost and obtaining explicit approval.
4. Never copy production user data into test fixtures.
5. Apply SQL drafts only to a disposable local database.
6. Run syntax, FK, trigger, seed, grants and RLS tests after each phase.
7. Run Supabase advisors when supported by the installed CLI/tooling.
8. Verify clean application from an empty database and migration history consistency.

## 6. Core schema test matrix

### Structure
- All required tables exist in `projects`.
- RLS is enabled on every table.
- `anon` and `authenticated` have no direct DML grants.
- Owner, creator and member identity FKs use restrictive deletion behavior.
- Composite parent FK enforces identical owner IDs along every edge.
- Parent deletion is restricted while children exist.
- Invalid project type/status and inconsistent archive state are rejected.
- New visibility rows default to private.

### Roles and permissions
- Exactly six system roles exist.
- Permission catalogue includes all approved codes, including `audit.view`.
- Seeded mappings exactly match specification Section 16.
- Parent roles cannot be assigned to children and vice versa.
- Custom roles are scoped to one project.
- Owner cannot be represented as a membership.
- Browser roles cannot mutate system roles or role mappings directly.

### Hierarchy and ownership
- Root owner is the authenticated creator in the eventual create RPC.
- Child owner must match parent owner.
- Parent membership is not inherited by child; child membership is not inherited by parent.
- Root owner can administer descendants without descendant memberships.
- No reparenting operation exists in release one.
- Concurrent hierarchy mutations serialize using the agreed root lock.

### Security
- Anonymous callers have no base-table access.
- Authenticated callers have no direct DML.
- Guessing a UUID does not grant row access.
- Wrappers derive actor from `auth.uid()`.
- Privileged functions use fixed search paths and fully qualified references.
- PUBLIC/anon EXECUTE is revoked before explicit per-signature grants.
- Authorization never relies on user-editable JWT metadata.
- Service-role credentials never enter browser artifacts or logs.

## 7. RPC/RLS test harness

Use pgTAP or an equivalent repeatable PostgreSQL harness. Create isolated test identities and switch JWT claims/roles explicitly.

Required personas: anon, unrelated authenticated A/B, root owner, parent administrator, parent manager, parent member, child leader, child developer, child observer and service role.

Every RPC test must cover valid use, unauthorized actor, spoofed UUID, malformed input, duplicate/replayed request, expired/revoked state and concurrency where applicable.

## 8. Corrections carried into SQL

1. Add `audit.view` to the canonical permission catalogue; it was added to the approved matrix but absent from the earlier permission seed list.
2. Public wrappers that access the unexposed internal schema may require `SECURITY DEFINER`. Treat each as a privileged API endpoint: check `auth.uid()`, set `search_path = ''`, fully qualify references, revoke default EXECUTE from PUBLIC/anon/authenticated, then grant only exact signatures.
3. Invitation/transfer token issuance and delivery must be trusted-server operations. The client must not choose arbitrary token hashes for newly created invitations or transfers. Persist only a cryptographic hash; deliver the raw bearer token through a protected one-time workflow.
4. Email delivery is not transactional with PostgreSQL. Insert an outbox row in the same transaction and send/retry asynchronously with idempotency.
5. Core draft RLS is enabled without client policies or grants. This is intentional default-deny until authorization/RPC phases are complete.

## 9. Release gates

No deployment to the connected Supabase project until:
- SQL is reviewed against a fresh live schema snapshot;
- clean local application succeeds on PostgreSQL 17;
- pgTAP/security tests pass;
- every SECURITY DEFINER function is reviewed;
- per-table RLS and grants are reviewed;
- API exposed schemas/default privileges are checked in Dashboard;
- Auth deletion integration is inspected;
- backup and rollback plan exists;
- user explicitly approves the final deployment plan.

## 10. Current state

- Role matrix and specification Sections 16–19: approved.
- Live database: read-only inspected; unchanged.
- Core SQL: draft only; not executed.
- Real Supabase migrations: not generated.
- Supabase production schema: unchanged.


## 11. Additional ownership-transfer invariant

The target owner must not already have a membership row in any project in the transferred hierarchy. The transfer-confirm operation must either reject the transfer until the target leaves those memberships, or atomically remove those memberships with explicit audit events before changing ownership. Release-one recommendation: reject and require membership cleanup first; this avoids silently changing the target's role/history during transfer.

The implementation must also ensure the previous owner is not accidentally reinserted as a member and that every descendant remains owner-consistent after the atomic transfer.

## 12. Validation status

The draft was reviewed structurally and stored in GitHub. A PostgreSQL parser/CLI is not available in the current execution environment, so SQL syntax has **not** been executed or certified. The next validation must run this draft against a disposable local Supabase/PostgreSQL 17.11 instance. This is an explicit remaining gate, not a claim of successful SQL execution.


## 13. Static review pass (2026-11-16)

A repository-level structural check of `projects-001-core-schema.sql` passed these ten checks:

1. Transaction wrapper contains both `BEGIN` and `COMMIT`.
2. Exactly eight core tables are declared.
3. RLS is enabled on all eight declared tables.
4. Six system roles are seeded.
5. The approved `audit.view` permission is present.
6. Direct table privileges are revoked from `PUBLIC`, `anon` and `authenticated`.
7. Parent/child owner equality is represented by the composite self-referencing foreign key.
8. Membership role-scope integrity trigger is present.
9. The SQL file is explicitly marked `REVIEW DRAFT — NOT APPLIED`.
10. The transfer membership precondition is documented for the later ownership-transfer phase.

This is a structural text-level review only. It does not parse or execute PostgreSQL SQL and does not prove runtime behavior. PostgreSQL/Supabase CLI, Docker and a PostgreSQL server are not installed in the current execution environment. The mandatory next validation remains execution against a disposable local Supabase/PostgreSQL 17.11 instance.


## 14. PostgreSQL execution validation passed (2026-11-16)

The core SQL draft was executed against an ephemeral PostgreSQL **17.11** service container in GitHub Actions. The database was disposable and contained only a minimal compatibility fixture for Supabase Auth (`auth.users`, `anon`, and `authenticated`). No production or development Supabase project was connected.

Two final validation runs completed successfully:

- Initial SQL application and core integrity suite: [run 43814014601](https://github.com/raymondovich-cloud/r.ru-Development/actions/runs/43814014601) — success.
- Expanded integrity suite, including private defaults, invalid project type, archive-state consistency, owner cascade through three hierarchy levels, Auth deletion blockers and parent deletion restriction: [run 43814119385](https://github.com/raymondovich-cloud/r.ru-Development/actions/runs/43814119385) — success.

The SQL migration draft applied and committed successfully in the disposable database. The test suite confirmed:
- eight core tables created;
- RLS enabled on all eight;
- six system roles and 20 permissions seeded;
- 54 role-permission mappings seeded;
- no schema/table access granted to `anon` or `authenticated`;
- parent/child owner consistency enforced by the composite FK;
- owner changes cascade through the tested three-level hierarchy;
- project and membership references block Auth account deletion;
- wrong role scope, wrong custom-role project, and owner-as-member assignments are rejected;
- invalid type/archive states are rejected;
- private visibility defaults are correct;
- parent deletion is blocked while descendants exist.

### Validation boundary

This is real PostgreSQL 17.11 execution, not merely static inspection. However, it is **not yet a full Supabase local-stack test**: the Auth schema and roles were represented by a minimal fixture. PostgREST exposure, Supabase JWT/RLS behavior, Supabase-managed grants, extensions and RPC wrapper security remain later validation gates.

The SQL remains a review draft and has **not** been applied to the connected Supabase project. Production schema remains unchanged.


## 15. Primary Supabase deployment completed (2026-11-16)

The user explicitly directed that the Projects core schema be applied directly to the primary Raymondovich Supabase project.

Target:
- Project ref: `yajybgdorhxebbigwjgi`
- Project name: `raymondovich`
- Region: `eu-central-1`
- PostgreSQL: `17.11`

Migration recorded by Supabase:
- Version: `20261116060455`
- Name: `projects_001_core_schema`

Post-apply verification against the live database passed:
- 8 of 8 expected tables exist in schema `projects`.
- RLS is enabled on all 8 tables.
- 6 system roles, 20 permissions, 54 role-permission mappings exist.
- Four component types seeded and active.
- `anon` and `authenticated` have no schema USAGE and no direct SELECT on `projects.projects`.
- `projects` schema is not currently configured for PostgREST exposure (runtime settings returned null).
- No project or membership records were created.
- Auth users and private profiles remain at the same observed counts (2 and 2).
- Existing Auth/private trigger count remains 3.
- Existing Auth/profile functions and triggers were not modified by this migration.

Supabase Security Advisor now reports the expected INFO finding `RLS Enabled No Policy` for the eight new tables. This is intentional default-deny: no browser grants, schema USAGE or RLS policies are added until the RPC/API authorization layer is implemented. Existing unrelated advisor findings remain unchanged.

The migration does not yet implement project RPCs, invitations, publications, audit history, resource sharing or ownership transfer. Those remain subsequent migrations.


## 16. RPC phase-1 compatibility and security corrections (2026-11-16)

The read-only preflight against primary Supabase confirmed that the applied core schema is compatible with the RPC migration's base assumptions. The following corrections were made in the development repository only; no change was applied to primary Supabase:

1. Added normalized `projects.project_components` (many-to-many) and migration-safe backfill from legacy `projects.projects.component_type_id`. The legacy scalar remains temporarily and is no longer written by new RPC code.
2. Changed `project_create` to accept `p_component_codes text[]`, validate the full set (known, active, non-empty, unique; online projects only), and permit zero or more components.
3. Replaced privileged public RPC bodies with `SECURITY INVOKER` wrappers in `public`. Privileged implementation functions are in the unexposed `projects` schema, use `SECURITY DEFINER`, fixed empty search path and qualified references.
4. Revoked default `PUBLIC`/anon/authenticated execution from internal functions, then granted exact internal signatures to authenticated. Granted schema USAGE only to authenticated. Base-table grants remain revoked and `projects` must remain excluded from PostgREST exposed schemas.
5. Expanded SQL tests to verify the five-wrapper privilege boundary and multiple components.

The migration and tests have been committed to `raymondovich-cloud/r.ru-Development`. GitHub Actions PostgreSQL 17.11 execution is the required next gate. This section does not claim that the updated SQL has passed CI or a full Supabase stack test.


## 17. Final RPC phase-1 CI result (2026-11-16)

Final migration version 1.2.0 and test version 1.3.0 passed GitHub Actions run #31 on PostgreSQL 17.11. The run applied the core schema, validated it, applied the RPC phase-1 migration, and ran the complete RPC test file successfully. This is isolated PostgreSQL CI with a minimal Auth compatibility fixture, not full Supabase integration. No migration has been applied to primary Supabase.


## 17. CI result for revised RPC phase 1 (2026-11-16)

- GitHub Actions run: `43817425318` — success.
- Job: `postgres-validation` (`133132540239`) — success.
- Commit tested: `8eef9f64e8b607eca0423cfc4673de598afb1d32`.
- Environment: ephemeral PostgreSQL 17.11 with a minimal Supabase Auth compatibility fixture.
- Both Projects core schema and RPC phase-1 migrations applied successfully; both SQL test suites passed.
- RPC test PASS: five invoker RPCs, isolated definer implementations, multi-component projects, ownership, permissions, deny precedence, suspension, private defaults, audit immutability, archive/restore and grants.

This validates SQL migration execution and the assertions in the repository's PostgreSQL CI. It is not a full Supabase stack/PostgREST integration test. Primary Supabase has not been modified.


## 18. PostgREST API integration validation (2026-11-16)

The development CI now starts PostgREST v14.17 against the ephemeral PostgreSQL 17.11 database after applying the Projects core and RPC migrations. A Python standard-library HTTP test signs synthetic HS256 JWTs for two test identities and exercises the RPC endpoints through HTTP.

**Latest successful run:** GitHub Actions run `43818747946`, commit `c804500c2a72b263fcdfc9e734c19c97b22d81e1`.

Assertions passed:
- Authenticated `POST /rpc/project_create` succeeds using a JWT subject and creates an online project with both `website` and `telegram_bot` components.
- Authenticated owner `GET /rpc/project_access_check` returns true for `project.update`.
- A different authenticated identity cannot update the owner's project (HTTP 401/403).
- An anonymous caller cannot execute `project_create` (HTTP 401/403).
- The `projects` schema is not exposed through PostgREST (request with `Accept-Profile: projects` returns HTTP 406).
- Both normalized project components are persisted in the database.

A defect in the earlier SQL-only test fixture was found and fixed: its stub `auth.uid()` read only the legacy `request.jwt.claim.sub` setting, while PostgREST v14 supplies the aggregate `request.jwt.claims` JSON setting. The fixture now supports both forms. This does not alter the hosted Supabase Auth implementation.

**Scope limitation:** this is a real HTTP/PostgREST integration test using an isolated local PostgREST 14.17 instance and synthetic JWTs. It is not yet a live request against the hosted Raymondovich Supabase API or a token issued by hosted Supabase Auth. The primary project remains unchanged; RPC Phase 1 is not applied there.


## 19. Read-only hosted Supabase preflight (2026-11-16)

The primary Raymondovich Supabase project (`yajybgdorhxebbigwjgi`, PostgreSQL 17.11) was rechecked after the local PostgREST integration passed.

- The hosted `auth.uid()` definition supports both legacy `request.jwt.claim.sub` and aggregate `request.jwt.claims` JSON claims. This matches the corrected CI fixture.
- The primary project still has only Projects Core Schema migration `20261116060455`; RPC Phase 1 is absent.
- `projects.project_components`, `public.project_create(..., text[])`, and `projects.project_create_internal(..., text[])` are absent on primary, as expected.
- `anon` and `authenticated` currently have no `USAGE` on schema `projects`.
- No hosted database changes were made.

A live HTTP request using a JWT issued by the hosted Supabase Auth service has not been performed. The available Supabase connector provides database operations but no authenticated user-session token or arbitrary REST request action. Do not substitute a service-role key or expose secrets to simulate a user. The hosted Auth/PostgREST end-to-end check remains a separate gate.


## 20. Final API CI and hosted deployment boundary (2026-11-16)

The final development-repository CI run `43818747946` passed on commit `c804500c2a72b263fcdfc9e734c19c97b22d81e1`. The PostgREST HTTP test reached all required positive and negative assertions; the earlier failed diagnostic runs are superseded by this successful run.

A fresh read-only query against primary Supabase confirmed:
- Core migration `20261116060455` remains the only Projects migration.
- All five RPC Phase 1 public functions are absent.
- `projects.project_components` and `projects.project_audit_logs` are absent.
- Neither `anon` nor `authenticated` currently has USAGE on schema `projects`.
- No hosted database objects were changed by this preflight.

Therefore a live hosted PostgREST call to the new RPCs cannot yet be made: those RPC endpoints do not exist on the primary project. Creating a Supabase development branch would allow an isolated hosted-stack test, but Supabase states that branch compute can incur hourly and other usage charges. Do not create a branch until its cost is disclosed and the user explicitly agrees.

The remaining gate is a hosted Auth + PostgREST test in a cost-approved isolated Supabase branch, or a separately authorized deployment to primary after the user reviews the final migration. The current CI result must not be described as a hosted Supabase end-to-end test.
