# SEO foundation

**Date:** 05.11.2026

Implemented on `architecture/spa-rewrite-2026-11-05`:

- strengthened root document metadata: robots directives, Open Graph locale/site name, X/Twitter summary metadata;
- added conservative JSON-LD `Organization` and `WebSite` graph using only confirmed public facts;
- added `robots.txt` and a sitemap containing only the canonical homepage;
- documented why hash-router fragments are not published as independent sitemap URLs;
- recorded route-specific SEO, prerender/SSR, canonical host and production validation as unresolved gates tied to the hosting/routing ADR.

No production hosting, DNS, Cloudflare, deployment, Supabase or Auth settings were changed. No merge into `main` was performed.

## Build artifact verification

- Added `public/robots.txt` and `public/sitemap.xml` mirrors so Vite copies crawler files into `dist/`; root copies remain available for branch-root Pages publishing.
- Extended `npm run test:build` to assert both files are present and byte-identical in the build output.
- Extended the build smoke check to reject inline CSS/style attributes and inline executable scripts across built HTML entry points; the approved JSON-LD structured-data script is explicitly allowed.
