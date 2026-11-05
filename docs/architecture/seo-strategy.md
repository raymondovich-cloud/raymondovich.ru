# SEO strategy — raymondovich.ru

**Status:** initial technical foundation implemented; production SEO architecture remains unresolved.  
**Scope:** architecture branch `architecture/spa-rewrite-2026-11-05`.  
**Last updated:** 2026-11-05.

## 1. Current implementation

The root document (`index.html`) contains the metadata for the public homepage:

- Russian document language.
- Descriptive page title and meta description.
- Indexing directives for the public root document.
- Canonical URL fixed to `https://raymondovich.ru/`.
- Open Graph locale, site name, title, description, type and URL.
- X/Twitter summary card metadata (without an image because no approved social preview asset exists).
- JSON-LD graph with `Organization` and `WebSite` entities, limited to facts supported by the current public positioning.
- Sitemap discovery link.

Crawler files:

- Source files live in Vite's `public/` directory: `public/robots.txt` and `public/sitemap.xml`. Vite copies them to the build output root as `/robots.txt` and `/sitemap.xml`.
- `robots.txt` allows crawling and points to the sitemap.
- `sitemap.xml` currently lists only the canonical homepage.

The sitemap deliberately does not list hash-router application destinations as independent indexable URLs.

## 2. Current routing limitation

The SPA currently uses Vue Router Hash History. Public destinations are represented in URL fragments (for example, `/#/products`). URL fragments are not sent to the web server and do not provide independent server-rendered documents.

Consequences:

- The current crawler-facing document is the root HTML document.
- A canonical URL per hash route cannot be made into a reliable independent indexing contract by changing client-side metadata alone.
- Client-side title changes are useful for browser navigation and accessibility, but they do not provide server-rendered route-specific metadata to crawlers or social link unfurlers.
- Adding every hash route to the sitemap would be misleading and is intentionally avoided.
- Private/authentication routes must not be advertised as public search landing pages.

## 3. Required production SEO decision

Before production launch, choose and test one of the following:

1. Server-rendered or statically prerendered public routes, with route-specific HTML metadata and canonical URLs.
2. A hosting/routing architecture that serves route-specific pre-rendered HTML while preserving the selected application architecture.
3. Explicitly accept a homepage-only indexing strategy if independent organic discovery of product/cooperation/about pages is not a requirement.

This decision is coupled to ADR-001 (hosting and routing). Cloudflare Pages remains a candidate, not an approved production hosting decision. Hosting, DNS, Cloudflare and deployment settings were not changed.

## 4. Follow-up SEO work

After the routing decision:

- Define the canonical host and redirect policy (apex vs www) based on the verified production domain contract.
- Publish a sitemap containing only canonical, indexable public URLs that return the intended HTTP status.
- Exclude owner, partner, external-project and authentication destinations from public indexing.
- Provide unique title, description, canonical and Open Graph metadata for each indexable public route.
- Add an approved social preview image and favicon/brand icons; do not invent or generate brand assets without approval.
- Validate structured data with Google's Rich Results Test / Schema Markup Validator where applicable.
- Validate crawlability, rendered HTML, redirects, HTTP status, robots and sitemap in Google Search Console and Bing Webmaster Tools after production deployment.
- Review page content and internal linking for useful, non-duplicative search intent; metadata alone is not an SEO strategy.

## 5. Explicit non-goals / safety boundaries

This work does not:

- change production hosting, DNS, Cloudflare, GitHub Pages or deployment;
- alter Supabase, Auth, RLS, database data or backend services;
- claim that the site has been indexed or that search rankings have improved;
- claim that each SPA route is independently indexable;
- add unapproved organization details, addresses, contact points, social profile identifiers or logos.

## 6. Acceptance criteria for the current phase

- Root metadata is internally consistent with the public homepage.
- Canonical URL points to the root document.
- `public/robots.txt` and `public/sitemap.xml` are copied by Vite to the output root and verified by the build smoke test.
- Sitemap does not list fragment-only routes as independent canonical URLs.
- Production route-specific SEO remains explicitly blocked on the hosting/rendering decision.
