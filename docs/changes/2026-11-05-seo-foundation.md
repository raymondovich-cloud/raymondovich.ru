# SEO foundation

**Date:** 05.11.2026

Implemented on `architecture/spa-rewrite-2026-11-05`:

- strengthened root document metadata: robots directives, Open Graph locale/site name, X/Twitter summary metadata;
- added conservative JSON-LD `Organization` and `WebSite` graph using only confirmed public facts;
- added `robots.txt` and a sitemap containing only the canonical homepage;
- documented why hash-router fragments are not published as independent sitemap URLs;
- recorded route-specific SEO, prerender/SSR, canonical host and production validation as unresolved gates tied to the hosting/routing ADR.

No production hosting, DNS, Cloudflare, deployment, Supabase or Auth settings were changed. No merge into `main` was performed.
