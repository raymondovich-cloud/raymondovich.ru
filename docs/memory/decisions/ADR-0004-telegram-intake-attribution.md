# ADR-0004 — Telegram Intake and Source Attribution

> **Project:** Raymondovich.ru  
> **Document:** Architecture Decision Record  
> **Version:** 1.2  
> **Status:** Approved for isolated implementation  
> **Date:** 2026-11-10

## Context

The public website needs one application form reachable from Telegram Mini App links shared through Telegram, Instagram, Threads and the website. The platform already has a Telegram bootstrap and a single platform bridge.

## Decision

1. Reuse the existing platform bootstrap and `window.RaymondovichPlatform`; do not introduce a second Telegram runtime or navigation controller.
2. Route accepted intake launch parameters to the existing SPA hash route `#apply`.
3. Keep launch parameters in transient in-memory platform state only. The hash remains navigation-only; localStorage and sessionStorage are not used for attribution.
4. Send the original raw `Telegram.WebApp.initData` to a server-side Edge Function.
5. Verify Telegram's HMAC-SHA-256 signature on the server before using the user identity or `start_param`.
6. Prefer `start_param` from HMAC-verified initData when present. For Telegram direct-link launches where the raw signed payload does not contain it, accept the SDK/GET startParam only as an untrusted allowlisted attribution hint and persist a source_param_signed flag.
7. Treat source/campaign as link attribution, not proof of the actual channel through which the user discovered the link.
8. Store requests in Supabase with RLS, service-role-only writes, an immutable owner ID loaded from a private database configuration table populated from the single Supabase Auth admin account, idempotency and transactional per-user rate limits. Authenticated reads require both `app_metadata.role = admin` and `auth.uid() = owner_id`.
9. Notify the owner through Telegram Bot API using secrets stored only in Supabase.
10. Delete a request 90 days after it is closed, using a daily database cleanup job.
11. Keep intake disabled by default. The Edge Function accepts requests only when the private `INTAKE_ENABLED` secret is exactly `true`, after the personal-data notice is completed and approved.

## Security boundary

Telegram Mini App `initDataUnsafe`, SDK platform, browser URL, hash, direct-link startParam and all form values are untrusted client inputs. Only a valid HMAC-verified `initData` establishes the Telegram-signed user identity. A start_param is an integrity-protected attribution label only when it is actually present in the verified payload; direct-link startapp is also exposed through tgWebAppStartParam and may not be part of the raw signed payload. Unsigned labels are stored with source_param_signed=false and are never used for authorization, roles or rate limits.

This feature does not authenticate a Supabase account, link Telegram identity to an existing account, grant a role or provide privileged access.

## Consequences

- No additional paid analytics service or server is required.
- A public Edge Function endpoint is necessary because a Telegram user does not have a Supabase Auth JWT. Platform JWT verification is disabled only for this endpoint; application-level Telegram validation is mandatory.
- The owner must start the bot before it can send a private message to the owner.
- The migration requires exactly one Supabase Auth account with `raw_app_meta_data.role = admin` and snapshots its ID into a private configuration table; the Edge Function never accepts an owner ID from the client.
- A Telegram delivery failure does not erase a stored request.
- The future Owner Control Center must implement closing/reopening requests so the retention period can begin.
- Production activation is blocked until legal notice details and staging verification are complete. The current Supabase region is Frankfurt; if Russian citizens' data is collected, legal review of 152-FZ Article 18(5) localization and Article 12 cross-border transfer to Telegram is mandatory before activation. The endpoint fails closed unless `INTAKE_ENABLED=true` is explicitly configured.

## References

- Telegram Mini Apps: `initData`, `start_param` and server-side validation.
- Supabase Edge Functions: function-specific `verify_jwt` configuration and secrets.
- Intake Module Specification v1.2.

## Version history

| Version | Status | Date | Changes |
|---|---|---|---|
| 1.2 | Approved for isolated implementation | 2026-11-10 | Corrected Telegram direct-link attribution trust model and added signed/unsigned source flag. |
| 1.1 | Approved for isolated implementation | 2026-11-10 | Added database-managed owner binding and fail-closed activation until legal notice and staging verification are complete. |
| 1.0 | Approved for isolated implementation | 2026-11-10 | Owner approved Telegram intake workflow and 90-day post-closure retention. |
