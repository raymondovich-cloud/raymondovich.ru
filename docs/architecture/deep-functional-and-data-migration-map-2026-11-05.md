# Deep functional and data migration map

**Date:** 2026-11-05  
**Scope:** Raymondovich.ru working branch only  
**Evidence:** Static source inspection of the legacy MPA baseline before SPA migration. No runtime behavior or production configuration was modified by this baseline inventory.

> **Historical baseline document.** Sections 1–5 capture legacy MPA behavior and initial repository/database evidence before the SPA rewrite. They are not a description of the current application implementation. The migration sequence and gates in sections 6–7 are the original plan and are superseded where they conflict with current decisions or implementation. For current routes, adapters, CI results, read-only Supabase findings and remaining merge blockers, see `docs/architecture/merge-preparation-status-2026-11-05.md` and `docs/architecture/final-repository-structure.md`. No live Supabase state was certified by this baseline document; the later read-only audit is recorded in the merge-preparation status.

## 1. Owner Control Center: behavior that must survive migration

The current private application is implemented in `pages/account/app.html` and a single approximately 38.6 KB presentation module, `source/presentation/app/app-page.js`. It is a legacy multi-page entry point, not the target application shell.

### Workspace views

- **Overview:** counts of incoming ideas, active projects, paused projects and priority items; priority ideas requiring attention; recent active/paused projects; latest ideas.
- **Ideas:** working list (new/review), launched history, archive; counts for incoming/review/priority/launched; create idea; open an idea detail editor; contextual actions.
- **Projects:** active/paused/completed working list and archive; priority ordering; project lifecycle actions and manual pinning.

The current local view state is held in an in-memory object. Navigation uses `data-view` and `data-go` attributes; it is not URL-addressable and does not survive reload. SPA migration must introduce stable named routes and URL state without losing the current view semantics.

### Idea use cases

- Create an idea with name, description and optional planning fields: goal, expected revenue, estimated cost, business model, concept and additional information.
- Open details and edit all of those fields.
- Move between new and review.
- Set/unset high priority.
- Archive and restore.
- Explicitly launch into a project.
- Delete permanently.
- Launched ideas remain visible as history and link to their generated project actions.

The idea list has a deliberate interaction distinction: ordinary click/tap opens details; long press (550 ms) or context menu opens actions. Keyboard Enter/Space opens details. This is a critical mobile Safari behavior and needs explicit pointer/touch, context-menu, keyboard and accessibility regression tests.

### Project use cases

- Create only through explicit launch from an idea in the current UI.
- Preserve source idea relationship and planning fields.
- Pause/resume, set/unset priority, complete, archive/restore, pin/unpin, delete.
- Deleting a linked project attempts to return the source idea to review.
- Project action menu is also opened from a launched idea's context menu.

### Shared shell behavior

- Authenticated account summary: display name, role, email and avatar initial.
- Account popover and logout.
- Responsive sidebar, backdrop, Escape handling and mobile menu state.
- Status/error announcements, loading/error fallbacks, confirmation before permanent deletion.
- Idea creation dialog and dynamically generated idea detail/action dialogs.

The migration must separate shell/layout, route pages, reusable dialogs, view models, interaction controllers and application use cases. The current monolithic DOM module is evidence of behavior only; it must not be moved intact into the SPA.

## 2. Authentication and account flows

Current use cases found in source:

- Read current Supabase session and resolve role from `user.app_metadata.role`.
- Email/password sign-in.
- Registration with optional `display_name`; email confirmation may be required.
- Ensure/update a `user_profiles` row after sign-in/registration when a session is immediately available.
- Sign-out.
- Password reset email and password recovery/update flow.
- Auth callback exchanges the URL query string for a session.
- Account settings: first name, last name, timezone, email update and password update.

### Existing URL contracts to preserve or deliberately redirect

- `/pages/auth/auth.html`
- `/pages/auth/register.html`
- `/pages/auth/auth-callback.html`
- `/pages/auth/reset-password.html`
- `/pages/auth/update-password.html`
- `/pages/account/app.html`
- `/pages/settings/settings.html`
- `/pages/profile/profile.html`

The callback and password recovery URLs are currently embedded in the authentication application service as absolute `https://raymondovich.ru/...` URLs. They must be migrated to a single URL policy/configuration source. Existing Supabase redirect allow-list and email templates must be inspected separately before any URL changes; this repository audit does not prove what is currently configured in the live Supabase dashboard.

The update-password page listens for `PASSWORD_RECOVERY`, checks for a session, validates matching passwords, updates the password, signs out and redirects. This flow must be tested end-to-end in an isolated environment; ordinary authenticated-session tests are insufficient.

The current role check in the UI is a navigation/UX gate only. All data access must continue to rely on server-side authorization and RLS; route guards must never be treated as a security boundary.

## 3. Current application/data boundary findings

- `authentication.js`, `idea-service.js`, `project-service.js`, and `account-settings.js` are named Application services but import the Supabase client directly. This couples use cases to Infrastructure.
- `app-page.js` mixes DOM access/rendering, formatting, state, interaction handling, business workflow orchestration and calls to Application services.
- Auth callback and password recovery Presentation modules import Supabase directly, bypassing the Application boundary.
- `client.js` loads Supabase JS from a CDN ESM URL and embeds the project URL and publishable key in the client bundle. The publishable key is not a secret; security depends on RLS and restricted grants. Migration to package-managed dependencies is a build decision, not a reason to expose service-role credentials.
- Existing error handling primarily forwards Supabase error messages. The new boundary should map infrastructure errors to stable application error types and user-safe messages.

Target direction: Domain owns business invariants and entities; Application owns use cases and ports; Infrastructure implements Supabase adapters; Presentation owns routes, components and interaction state. Domain/Application must not import Supabase, DOM, Router or UI framework modules.

## 4. Database and authorization evidence

The repository contains ten SQL migrations in the inspected branch. The checked-in migration history includes:
- Private ecosystem tool/resource registry tables and owner/admin RLS policies.
- Least-privilege grants for the private registry.
- Project pinning columns and index.
- Project lifecycle expansion.
- Separate `ideas` table with owner/admin policy and authenticated grants.
- `projects.source_idea_id` relationship and uniqueness constraint.
- Optional planning fields on ideas and projects, including nonnegative numeric constraints.

The ideas migration explicitly enables RLS and defines an authenticated admin-only policy requiring both JWT app-metadata role `admin` and `owner_id = auth.uid()`. The private registry migration similarly defines owner/admin policies for its own tables.

Important evidence limitation: the repository migrations do not show the original creation of `public.projects` or `public.user_profiles`, nor do the checked-in migrations establish the complete current policy/grant state for those pre-existing tables. The live Supabase schema and policies must therefore be inspected in a read-only manner before certification. Do not infer that projects are protected merely because client queries filter by `owner_id`; client filters are not authorization.

No SQL, RLS, grants, live database, Edge Function, or production data was changed as part of this inspection.

## 5. Data consistency risks to address before migration is considered complete

1. **Idea launch is a multi-request workflow.** The current service looks up an existing project, inserts a project, then updates the idea. It attempts compensating deletion if the idea update fails, but the compensation result is ignored. A failed compensation can leave an active project with an unlaunched source idea.
2. **Project deletion is also multi-request.** The project is deleted first, then the source idea is restored to review. If the second request fails, the project is gone while the idea can remain marked launched.
3. **Concurrent launch requests.** A unique index on `projects.source_idea_id` prevents duplicate linked projects, but the service's lookup-then-insert sequence can still surface a uniqueness race to the user. The application should handle this idempotently.
4. **Project deletion semantics.** The source relationship uses `ON DELETE SET NULL` when an idea is deleted; the intended business behavior should be explicitly retained.
5. **Priority and pinning are separate concepts.** Priority is a business planning field; pinning is a manual presentation/order preference. Do not conflate them in the new model.
6. **Status sets differ.** Ideas use `new/review/launched/archived`; projects use `active/paused/completed/archived`. The old project statuses `idea/review` were removed by the migration sequence. The new UI must not reintroduce them.
7. **Project pin ordering.** The database has `is_pinned` and `pin_order`, but the current client-side list is sorted by priority and updated time. Pin-order behavior and its intended UX need a separate product rule before implementation.

Recommended future backend hardening: make launch and delete/restore transitions atomic using a database transaction exposed through a narrowly scoped RPC or server-side use case, with explicit authorization checks and idempotency. This is a recommendation only; no backend change is authorized by this document.

## 6. Original migration sequence (historical; partially superseded)

1. Establish package/build/test configuration and the single SPA entry point.
2. Add the app composition root, centralized route registry and Hash Router for the approved temporary GitHub Pages environment.
3. Add Infrastructure ports/adapters for Supabase Auth, profile settings, ideas and projects.
4. Migrate authentication/recovery routes and verify redirect contracts in isolated Supabase.
5. Migrate the owner shell and route-addressable overview/ideas/projects views.
6. Migrate dialogs, long-press/context actions, keyboard behavior, responsive sidebar and account popover.
7. Migrate account settings.
8. Add automated unit, integration, route and browser tests; verify on real iOS Safari.
9. Add backward-compatible legacy URL redirects/entry shims only where required, then retire legacy page implementations after parity verification.
10. Reconcile the migration matrix and provide a complete diff and verification report before requesting merge approval.

## 7. Original non-goals and gates (historical; current gates live in merge-preparation-status)

- This document does not approve Vue, React, Svelte or any other framework.
- This document does not authorize dependency installation, application code migration, database changes, Supabase dashboard changes, DNS/hosting changes or deployment.
- ADR-002 remains PROPOSED. Application implementation is gated on owner approval of the frontend stack.
- All work remains on `architecture/spa-rewrite-2026-11-05`; `main`, backup branches and `raymondovich.online` remain untouched.
