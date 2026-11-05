# Final CI and merge-preparation checkpoint

**Date:** 2026-11-05  
**Repository:** `raymondovich-cloud/raymondovich.ru`  
**Branch:** `architecture/spa-rewrite-2026-11-05`

## Latest verified executable revision

- Code/test commit: `4b9ca6b65a2b80e6ff1080ef5c02214763d562f2`
- GitHub Actions run: `42105900028`
- Result: SUCCESS.
- `npm ci --ignore-scripts --no-audit --no-fund`: SUCCESS.
- `npm test`: **56 passed, 0 failed**.
- `npm run build`: SUCCESS.
- `npm run test:build`: SUCCESS.
- Build smoke includes root SPA entry, legacy redirects, Auth callback/recovery bridges, crawler assets, route registry and architecture boundaries.
- Migration contract tests cover all 14 migration files, the admin function ACL lock, project RLS/grants, seed contracts, transaction boundaries and destructive-DDL guard.

Later changes after the tested executable commit were documentation-only. A new workflow run is required after the final documentation checkpoint before PR review.

## Repository and migration integrity

- `main` remains at `89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4`.
- The migration branch was 0 commits behind `main` at the latest comparison before this checkpoint.
- All 14 checked-in Supabase migration files match live `supabase_migrations.schema_migrations` versions/names and stored SQL statements; content differences: **0**.
- The migration files were restored from the live ledger. No migration was applied to production.
- Clean local Supabase replay remains unverified because data-seed migrations require isolated fixtures (admin owner and LifeGame project).

## Production hosting finding

- Cloudflare Pages project list is empty for the connected account.
- Cloudflare DNS points the apex to GitHub Pages IP addresses; `www` is a DNS-only CNAME to `raymondovich-cloud.github.io`.
- No `gh-pages` branch or repository deployment workflow was found. The exact GitHub Pages publishing source setting could not be read.
- Merging the root `index.html` cutover into the configured Pages source may publish the SPA to the public site.
- ADR-001 approves Hash Router only for temporary test use; production routing/hosting remains undecided.

## Remaining gates

1. Owner approval of production cutover and hosting/routing approach.
2. Explicit decision whether Partner Workspace and External Project Workspace remain placeholders in this release; neither is operational.
3. Browser E2E and real iOS Safari validation.
4. Supabase Auth redirect allow-list verification.
5. Review/remediation of live `anon` privileges on `public.ideas`, including TRUNCATE (RLS does not protect TRUNCATE); no grants were changed.
6. Review of Security Advisor warning: Leaked Password Protection disabled.
7. Clean local Supabase migration replay with isolated fixtures.

## Merge safety

- No merge to `main`.
- No production deployment.
- No production Supabase/Auth/RLS/grants, DNS, Cloudflare, hosting or deployment changes.
- The branch contains many incremental commits; when the PR is approved, **squash merge** is recommended to keep `main` history clean.

**Status:** automated source/build verification is green. Production cutover and remaining security/acceptance gates are not approved; do not merge or deploy until the owner explicitly confirms.
