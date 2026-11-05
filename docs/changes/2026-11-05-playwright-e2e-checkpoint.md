# Playwright E2E checkpoint

**Date:** 05.11.2026

- Added pinned Playwright Test 1.64.1 with a committed npm lockfile dependency graph.
- Added Chromium and iPhone 13 WebKit emulation projects.
- Added browser scenarios for public routes/content, legacy URL/query/anchor handoff, Back navigation, Owner authorization, auth form flows, crawler assets and horizontal overflow.
- CI now runs browser E2E after unit tests, Vite build and build-output smoke checks.
- Recorded the current browser E2E run as pending; the suite must not be marked green until a complete run passes on the final branch HEAD.
- Clarified that WebKit emulation does not replace real iPhone Safari testing.

No production deployment or live Supabase operation was performed.
