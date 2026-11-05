# SEO build asset correction

**Date:** 05.11.2026

- Confirmed that Vite copies files from `public/` into the root of `dist/`.
- Kept crawler source files at `public/robots.txt` and `public/sitemap.xml`.
- Removed duplicate repository-root copies.
- Updated the build smoke test to compare emitted `dist/robots.txt` and `dist/sitemap.xml` against their canonical source files.
- Updated SEO and merge-preparation documentation to record the real build path.

This is a build-output correction only. No hosting, deployment, DNS or production configuration was changed.
