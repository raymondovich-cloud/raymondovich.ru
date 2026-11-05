# Application tests and CI verification

**Date:** 05.11.2026  
**Branch:** `architecture/spa-rewrite-2026-11-05`

## Changes

- Added Node.js built-in test runner command (`npm test`) without introducing another test framework dependency.
- Added unit coverage for idea, project, authentication and account-settings application services.
- Covered owner-scoped repository delegation, input normalization, allow-listed update fields, auth callback configuration, account metadata mapping, project launch/restore behaviour and rollback failures.
- Updated SPA build workflow to execute unit tests before the production build.
- Disabled cancellation of in-progress runs for this branch so rapid commits do not prevent the final candidate from receiving a complete CI result.
- Corrected Profile.vue to consume the composed authentication runtime.
- Corrected the public home sign-out handler to call the injected authentication operation without recursively shadowing it.

## Verification

- The latest completed run before the public-home fix reported all 30 application unit tests passing.
- The same run exposed a Vue SFC build error caused by a duplicate `logout` identifier; the public-home handler was corrected in the branch.
- A fresh build on the corrected branch head is required before considering the change verified.
- No production deployment, production Supabase change, or merge to `main` was performed.

## Remaining verification

- Re-run CI on the exact final branch SHA.
- Add lockfile and switch CI to reproducible `npm ci` after generating and verifying the lockfile.
- Complete browser/E2E, isolated Supabase/RLS and real iOS Safari checks.
