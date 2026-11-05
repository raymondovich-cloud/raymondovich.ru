# Application tests and CI

Date: 2026-11-05

## Changes

- Added Node.js built-in unit tests for authentication, account settings, ideas, projects and domain invariants.
- Added a CI workflow limited to `architecture/spa-rewrite-2026-11-05` and manual dispatch.
- The workflow generates and commits `package-lock.json` when dependency metadata changes, then runs `npm ci`, `npm test`, `npm run build` and `npm run test:build`.
- Direct frontend dependencies are pinned:
  - Vue 3.5.45
  - Vue Router 5.4.0
  - Supabase JS 2.119.0
  - Vite 8.3.6
  - Vite Vue plugin 6.0.10
- Node.js engine requirement is `>=22.12.0`; CI currently runs Node.js 22.

## Latest verification

- Workflow run: `42102546920`
- Tested code commit: `73e6a9d79f464b35ed4455b8f4408625560ab008`
- Result: success.
- Unit tests: 42 passed, 0 failed.
- Production build: passed.
- Built-output smoke checks: passed.
- The current branch head subsequently received a documentation-only commit `95525b30f61f0944af16f68f6fac5375007b4815`; executable source and package files were unchanged by that commit.

## Scope

- CI does not deploy the site or change hosting.
- No production Supabase, Auth, DNS, Cloudflare or application data was changed.
- Passing unit/build checks do not substitute for real-browser end-to-end tests or iOS Safari verification.
