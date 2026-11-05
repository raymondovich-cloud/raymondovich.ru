# Functional inventory and migration matrix

**Date:** 05.11.2026

- Added a static inventory of the 16 HTML entry points, 15 JavaScript modules, 2 CSS files and 10 SQL migration files present in the working branch.
- Mapped the existing public pages, authentication flows, account settings, ideas and projects services to target SPA areas.
- Recorded inline CSS/JavaScript findings, legacy URL and callback compatibility risks, and unresolved toolchain decisions.
- This is a static repository audit only; no runtime behavior is certified and no feature is declared migrated.
- No application code, SQL migrations, Supabase configuration/data, hosting, DNS, Cloudflare, or production deployment was changed.
- The inventory is a working migration artifact and must be updated as deeper inspection and migration progress.


- Added a deep functional/data migration map for the Owner Control Center, including overview/ideas/projects workflows, long-press and keyboard interactions, authentication and password recovery URL contracts, account settings, and legacy route compatibility.
- Mapped the existing Application-to-Supabase coupling and recorded data consistency risks in idea launch and linked-project deletion workflows.
- Reviewed the checked-in SQL migration evidence for ideas, projects extensions, private registry RLS/grants, and documented the limits of what can be certified without read-only inspection of the live Supabase schema.
- No runtime tests, database changes, production configuration changes, or deployment were performed. Frontend implementation remains gated on ADR-002 approval.
