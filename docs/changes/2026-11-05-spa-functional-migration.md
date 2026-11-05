# SPA functional migration

Date: 2026-11-05  
Branch: `architecture/spa-rewrite-2026-11-05`

## Implemented in the migration branch

- Switched the root `index.html` entry to the Vue SPA. Kept `spa.html` as a separate non-indexable preview entry.
- Added a unified Vue Router route registry with public, authentication, owner, partner, external-project and not-found route spaces.
- Added dedicated owner section routes: `/owner`, `/owner/ideas`, and `/owner/projects`.
- Migrated the public home, products, cooperation formats, about, profile, settings and legal information views into Vue components.
- Migrated the Owner Control Center UI for ideas and projects, including create/edit, status and priority changes, archive/restore, idea-to-project launch, project pause/resume, completion, pinning, deletion, touch long-press context actions and keyboard activation.
- Connected profile and settings views to the existing Supabase account data operations.
- Added legacy URL handoff pages for the previous public, account, auth-login/register/reset and legal URLs. The redirect preserves query strings and old fragment anchors.
- Added pre-router normalization for legacy root anchors such as `/#private` so they remain compatible with Hash History.
- Kept the Supabase auth callback and password-update pages as dedicated legacy bridges. The callback may receive PKCE query parameters or implicit-flow token fragments; the password-recovery fragment conflicts with a Hash Router route. Both bridges use the shared authentication application service.
- Split Supabase auth, account, ideas and projects access into Infrastructure gateways/repositories. Application use cases now receive dependencies; idea/project invariants live in the Domain layer. Presentation composition is isolated in `source/presentation/runtime/`.
- Added exact frontend dependency versions and committed `package-lock.json`. CI uses `npm ci`, Node.js 22.12+, unit tests, Vite build and built-output smoke checks.

## Verification completed

- Application and domain unit tests: 49 passed, 0 failed.
- Vite production build: passed.
- Built-output smoke checks: passed, including root SPA entry, legacy route handoffs, auth bridge outputs, route registry, Domain/Application/Presentation boundaries and CSS separation.
- A successful complete CI run was recorded for commit `ef0701a9be2ad160037f6b1835a6384685e9318c` (run `42103202430`). The branch head is newer only by documentation commits; source, tests and package files are unchanged from the tested code commit.

## Read-only Supabase schema and security review

The linked Supabase project was inspected without changing database or Auth settings:

- `ideas`, `projects` and `user_profiles` exist; RLS is enabled.
- Ideas and projects have authenticated admin-only policies that also constrain `owner_id = auth.uid()`.
- User profiles have authenticated own-profile policies.
- A unique index exists for `projects.source_idea_id`, supporting one project per source idea.
- The `anon` role has broad table-level grants on `ideas`, including `TRUNCATE`. No anon RLS policy exists for row-level operations, but PostgreSQL RLS does not protect `TRUNCATE`; this remains a critical least-privilege risk and was not changed.
- Supabase Security Advisor reports leaked-password protection disabled. This setting was not changed.

## Remaining gates before merge approval

- Partner Workspace and External Project Workspace are intentionally limited to protected placeholders. The repository does not yet define their membership, invitation, commercial agreement, external-project data model or corresponding RLS policies. No backend behavior was invented.
- Supabase Auth redirect allow-list settings were not available for read-only verification. Existing callback and password-reset URLs remain unchanged.
- No real-browser end-to-end session was run, and iOS Safari visual/interaction verification remains outstanding.
- Existing Supabase RLS/grants and the leaked-password protection setting require a separate security decision. No production Supabase, Auth, DNS, hosting, Cloudflare or deployment changes were made.
- `main` was not modified or merged.
