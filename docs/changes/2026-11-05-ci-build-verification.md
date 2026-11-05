# CI build verification

Date: 2026-11-05

## Changes

- Added `.github/workflows/spa-build-check.yml`.
- The workflow runs only for pushes to `architecture/spa-rewrite-2026-11-05` and manual dispatch.
- Uses Node.js 22, installs project dependencies, and runs the existing Vite production build.
- The workflow has read-only repository permissions and does not deploy or modify hosting, Supabase, DNS, or production resources.

## Verification

- Workflow file was fetched back from the target branch and its content and blob SHA were confirmed.
- At the time of this entry, GitHub Actions had not yet exposed a run for the workflow. No successful build is claimed.
- Runtime/build verification remains pending.

## Scope

This is verification infrastructure only. It does not complete the SPA migration and does not authorize merging into `main`.

## First CI attempt and correction

- Run `42097174620` failed before dependency installation because `actions/setup-node` npm caching requires a lockfile, and this branch does not yet contain one.
- Removed npm cache configuration so the workflow can bootstrap dependencies without a pre-existing lockfile.
- A new push-triggered run is expected for the corrected workflow. The build itself has not yet been reached; no application build result is claimed.
