# Final SPA integration audit

**Date:** 05.11.2026  
**Branch:** `architecture/spa-rewrite-2026-11-05`

## Implementation and compatibility

- Promoted the Vue SPA to the root `index.html` entry point.
- Kept `spa.html` as a noindex legacy handoff, not a second SPA.
- Converted public/account/auth landing pages to explicit SPA route handoffs.
- Retained the existing Supabase email callback and password-recovery HTML bridges because current implicit-flow links can contain token fragments that conflict with Hash Router.
- Added support for both implicit session callbacks and PKCE code callbacks; after email confirmation, the `user_profiles` row is ensured and redirects are role-aware.
- Added owner workspace routes for Overview, Ideas and Projects (`/owner`, `/owner/ideas`, `/owner/projects`), with route state reflected in browser history and Back/Forward.
- Added legacy anchor/hash compatibility before Router initialization.

## Architecture and quality

- Added Domain rules for Idea and Project normalization/validation.
- Made concurrent idea launch idempotent on unique-source conflict (`23505`); the service re-reads the winning project and synchronizes the idea. Partial project-delete recovery errors now state explicitly that the project was deleted but source-idea restoration failed.
- Kept Supabase SDK access behind Infrastructure gateways/repositories and Presentation runtime composition.
- Added unit tests for Domain and Application services, architecture boundary tests and build-output smoke checks.
- Added Node.js built-in `node:test` runner and CI execution.
- Latest confirmed complete CI before this documentation update: run `42104225677`, build job checkout SHA `6148c7f5ccf044b0911e44787f002bf62098ed47`; 50 tests passed, 0 failed, build and built-output smoke checks passed.
- CI lockfile generation and installation use a committed `package-lock.json` and `npm ci`.

## Read-only production Supabase audit

No production changes were made. Read-only schema/policy/grant inspection found:
- RLS enabled for `ideas`, `projects` and `user_profiles`.
- Live policies scope ideas/projects to admin role and matching owner ID; user profiles are scoped to their own user ID.
- Live `projects` admin policy is not represented in checked-in migrations.
- `anon` has broad table privileges on `ideas`, including TRUNCATE; RLS does not protect TRUNCATE. This needs separate security review and explicit approval before remediation.
- Security Advisor reports Leaked Password Protection is disabled.
- No partner/external membership tables were found.

## Not completed / not authorized

- Partner Workspace and External Project Workspace remain non-operational placeholders; read-only live schema inspection found no partner/external membership model.
- No isolated Supabase RLS/integration tests, browser E2E suite or real iOS Safari test were performed.
- Production Auth allowlist/email template settings, SEO/prerender and production hosting/routing remain unresolved.
- No production Supabase/Auth/RLS/grant, DNS, Cloudflare, hosting, deployment or `main` changes were performed.
- No merge was performed.
