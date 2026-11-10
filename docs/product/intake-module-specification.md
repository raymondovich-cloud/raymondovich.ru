# Intake Module Specification

> **Project:** Raymondovich.ru  
> **Document:** Intake Module Specification  
> **Version:** 1.4  
> **Status:** Draft for implementation review  
> **Date:** 2026-11-10

## 1. Purpose

Intake receives requests through the public Raymondovich.ru website form. Visitors do not need Telegram or an account. The backend validates and stores each application, then notifies the owner through Telegram Bot API. The existing Telegram Mini App remains a separate compatible entry point to the legacy submission endpoint.

Intake is a request intake channel, not an account registration mechanism and not proof of a contractual relationship.

## 2. Scope

Included:
- Ordinary browser submission through the website-first anonymous Edge Function.
- Server-side validation of request shape, consent notice version, idempotency and attribution metadata.
- Existing Telegram Mini App submission through its legacy endpoint, retained for compatibility.
- One form with name, interest, message and consent.
- Idempotent persistence, per-user rate limits and owner notification.
- Owner-only read access at the database layer for a future Control Center screen.
- Retention of 90 days after a request is closed.

Excluded:
- Public web form submissions outside Telegram.
- User registration, Telegram-to-Supabase account linking, or role assignment.
- Partner approval, contract creation, payments or automatic workspace provisioning.
- Public analytics dashboards or third-party analytics services.
- Automatic retry queue for failed Telegram notifications.
- Owner Control Center presentation for viewing and closing requests (separate vertical slice).

## 3. Launch attribution contract

Telegram direct Mini App links pass the non-empty `startapp` value to the Mini App as `start_param` and `tgWebAppStartParam`.

Accepted value:
```regex
^(tg|ig|threads|site)(_[a-z0-9]{1,24})?$
```

Mapping:
- `tg` → Telegram
- `ig` → Instagram
- `threads` → Threads
- `site` → Website
- Any absent or invalid value → `source = other`, `campaign = null`

The browser keeps the Telegram launch parameter in memory and sends the raw start parameter with the request. Important: Telegram's direct-link documentation guarantees that startapp is passed as start_param and tgWebAppStartParam, but the raw signed initData schema does not guarantee that start_param is present for direct-link launches. The server therefore prefers start_param from HMAC-verified initData when present; otherwise it accepts the client startParam only as an untrusted, allowlisted attribution hint. The database records source_param_signed so the owner can distinguish the two cases.

A valid Telegram signature proves that Telegram issued the signed launch payload. It does not prove the real-world platform where the user discovered or opened the link. Attribution is therefore a link label, not independently verified marketing provenance.

The URL hash remains reserved for SPA navigation. It must not be used to persist source or campaign. No localStorage or sessionStorage is required for attribution. A client-supplied direct-link label can be altered or spoofed and may not match the channel where the link was actually seen; it is for marketing analysis only.

## 4. Form contract

Fields:
- `name`: required, 1–80 characters; prefilled from Telegram first/last name as a convenience, editable by the user.
- `interest`: required enum: `partner`, `own_product`, `question`.
- `message`: required, 1–1000 characters; UI hint: «Чем занимаетесь и чего хотите от сотрудничества».
- `consent`: required explicit confirmation of the linked personal-data notice; the server records the consent timestamp.
- `idempotencyKey`: UUID generated when the form is opened and reused for retries until success.
- `initData`: raw `Telegram.WebApp.initData`; never use `initDataUnsafe` for server trust.
- `startParam`: transient Telegram launch label from the SDK/GET parameter; untrusted unless the same value is present in verified initData.

Do not collect phone numbers, email addresses, identity documents, payment details or unrelated profile information.

The client platform is an untrusted diagnostic hint from the Telegram SDK. It must not affect authorization, rate limits or source attribution and must be labelled as a client-reported value in owner notifications.

Outside Telegram, or when raw `initData` is absent, the form must not submit. Show a clear message and a button to open the Mini App using `startapp=site`.

## 5. Server contract

Endpoint: `POST /functions/v1/intake-submit`

Request JSON:
```json
{
  "initData": "raw Telegram.WebApp.initData",
  "idempotencyKey": "uuid",
  "name": "string",
  "interest": "partner | own_product | question",
  "message": "string",
  "consent": true,
  "clientPlatform": "untrusted SDK hint"
}
```

The server must:
1. Validate Telegram HMAC-SHA-256 using the bot token.
2. Reject duplicate query-string keys, malformed data, invalid hash and missing required signed user data.
3. Reject `auth_date` older than 24 hours or more than 60 seconds in the future.
4. Read Telegram user ID, username and language only from the verified payload.
5. Prefer `start_param` from verified initData. If absent (as can occur for direct-link launches), validate the client startParam against the strict allowlist and mark it unsigned. Store whether the chosen parameter was included in verified initData.
6. Validate and normalize all user-entered values.
7. Enforce database-backed idempotency and rate limits: maximum 1 new request per Telegram user per 10 minutes and 5 per rolling 24 hours.
8. Persist before attempting the Telegram notification.
9. HTML-escape every dynamic value in the Telegram message.
10. Never log bot tokens, raw initData, Telegram IDs or message text.

The Edge Function uses `verify_jwt = false` because the caller is not a Supabase-authenticated user. This is safe only because the function performs its own Telegram signature validation and database-backed rate limiting before accepting a request.

## 6. Persistence and access

Table: `public.intake_applications`.

- RLS enabled and forced.
- `anon` has no table privileges.
- `authenticated` can read only when the JWT `app_metadata.role` is `admin` and `auth.uid()` matches the row's `owner_id`.
- `authenticated` cannot insert, update or delete.
- Every row stores the fixed Supabase Auth `owner_id`, loaded by the database from `intake_private.intake_owner_config`, populated during migration from the single account with `raw_app_meta_data.role = admin`; the owner ID is never accepted from the client.
- Only the server-side service role may write.
- Database-backed rate limiting is serialized per Telegram user to avoid concurrent-request races.
- A duplicate idempotency key returns the original application identifier and does not send another notification.
- `source_param_signed` is true only when the selected source parameter was part of HMAC-verified initData; otherwise the source is explicitly an unsigned client attribution hint.

## 7. Lifecycle and retention

Statuses:
- `new`
- `notified`
- `notify_failed`
- `closed`

Closing a request sets `closed_at`. Reopening clears it. Requests are deleted 90 days after `closed_at`. A daily database job performs cleanup; actual deletion can occur up to 24 hours after the 90-day threshold.

Unclosed requests are retained until they are closed. The future Owner Control Center “Заявки” slice must provide an explicit close action. The owner must not assume that merely receiving or reading a notification closes a request.

Consent timestamp is stored with the request. No legal conclusion about the sufficiency of the notice or consent is implied by this technical implementation.

## 8. Notification

Send a concise HTML message to the owner through Telegram Bot API `sendMessage`.

Required fields:
- Application number (short UUID prefix).
- Source and optional campaign.
- Whether the source parameter was present in signed initData or accepted as an unsigned link hint.
- Interest label.
- Name.
- Telegram username or numeric ID, with a `tg://user?id=...` profile link.
- Client-reported platform hint and signed language.
- Time formatted in Europe/Moscow.
- User message, safely truncated.

Telegram Bot API credentials and owner chat ID are Supabase Edge Function secrets only.

A notification failure does not undo a successfully persisted request. The request remains `notify_failed` and the client receives a success acknowledgement because the request itself was stored. Automatic retry is not included in this version.

## 9. Privacy and operational prerequisites

Before public production activation:
- Complete and approve the personal-data notice with the operator's legal identity, legal basis, contact route, processing purposes, recipients and any required international-transfer disclosures.
- Confirm that the chosen legal basis and consent wording are appropriate for the operator's jurisdiction.
- If the operator collects personal data of Russian Federation citizens, obtain legal review of part 5 of Article 18 of Federal Law 152-FZ: the current Supabase primary database is in EU Central (Frankfurt), so it must not be assumed suitable as the sole primary database for such collection. Determine whether the law applies and whether an exception is available before activation.
- Assess the transfer of request data to Telegram Bot API separately under Article 12 (cross-border transfer). A checkbox alone does not establish that all localization, notification and transfer requirements are met.
- Do not enable the form until the operator's jurisdiction, data-subject geography, primary database location and Telegram transfer basis have been documented.
- Confirm `TELEGRAM_BOT_TOKEN` and `OWNER_CHAT_ID` secrets in the intended Supabase environment.
- Keep `INTAKE_ENABLED` unset/false until the personal-data notice is complete and approved. The Edge Function returns HTTP 503 unless the secret is exactly `true`.
- Verify the Supabase migration chain against the remote project; the current repository snapshot is missing several migrations present in the connected database.
- Apply the migration only in an isolated staging database first.
- Verify real Telegram launch flows, notification delivery, retention cleanup and iPhone Safari behaviour.

## 9.1. Jurisdiction and data-location risk

The connected Supabase project currently reports region `eu-central-1` (Frankfurt). This is a technical fact, not a legal approval. For Russian citizens, part 5 of Article 18 of Federal Law 152-FZ restricts the use of databases outside the Russian Federation for specified collection and primary processing operations, subject to statutory exceptions. Cross-border transfer to Telegram must be assessed separately under Article 12. These points require qualified legal review for the actual operator and data flows.

References: [152-FZ, Article 18 (current text)](https://www.consultant.ru/document/cons_doc_LAW_61801/cbf4e15b7c330f9372e876cdf2bc928bad7950ef/); [152-FZ, Article 12 (current text)](https://www.consultant.ru/document/cons_doc_LAW_61801/e4ebbe1780de623c7cf32a59ca82a7bb523a25dd/).

## 10. Acceptance criteria

- All four source links open the same form and store the correct source label.
- Campaign suffixes are parsed only when they match the allowlist.
- Tampered or expired initData is rejected.
- Client-supplied source fields cannot override verified start_param.
- No request can be submitted outside Telegram.
- Duplicate submissions with the same idempotency key do not create duplicate records or notifications.
- Rate limits are enforced transactionally.
- HTML input cannot inject Telegram markup.
- All dynamic form values are escaped in owner notifications.
- Requests are inaccessible to anon and ordinary authenticated users.
- Closed requests are deleted after 90 days by the scheduled cleanup job.
- Existing authorization, PIN, Ideas, Projects and Telegram publication flows remain unchanged.

## 11. Version history

| Version | Status | Date | Changes |
|---|---|---|---|
| 1.1 | Draft for implementation review | 2026-11-10 | Added database-managed owner binding, fail-closed activation gate and legal readiness requirements. |
| 1.0 | Draft for implementation review | 2026-11-10 | Initial intake scope, Telegram attribution, validation, persistence, notification and retention contract. |


## 4.1. Conditional questions — version 1.3

The form has four common fields and interest-specific questions. The selected interest controls which additional fields are visible and enabled; inactive fields are disabled and are not submitted.

Common fields:
- name: Telegram display name prefill, editable, required.
- interest: required choice: partner («Хочу стать партнёром»), own_product («Есть свой продукт»), question («Есть вопрос»).
- message: required, maximum 1000 characters, with the hint «Чем занимаетесь и чего хотите от сотрудничества».
- consent: required checkbox.

When interest = partner:
- partnerRole: required enum: co_development (development and launch jointly with the ecosystem), ecosystem_tools (launch own project using ecosystem tools), promotion_only (promote own project in the ecosystem without tool access).
- weeklyAvailability: required enum up_to_5, 5_to_15, over_15.
- portfolioUrl: optional HTTPS URL, maximum 2048 characters.

When interest = own_product:
- productName: optional text, maximum 120 characters.
- productUrl: optional HTTPS URL, maximum 2048 characters.
- productStage: required enum idea, in_development, launched.

When interest = question, no conditional fields are shown or accepted.

Persistence uses typed nullable columns on public.intake_applications, not a client-controlled JSON blob. Database constraints enforce the selected-interest shape. The Edge Function validates enums, text length, HTTPS URLs and conditional requirements before invoking the database RPC. Telegram owner notifications include the applicable conditional answers.

No change to activation controls, secrets, legal readiness or deployment is implied by this schema revision.

## Version history — amendment

| Version | Status | Date | Changes |
|---|---|---|---|
| 1.3 | Draft for implementation review | 2026-11-10 | Added common and interest-dependent fields, server-side validation, typed persistence and notification requirements. |

## 12. Owner-approved architecture amendment — website-first Intake (2026-11-10)

**Status:** Approved by the owner. This section supersedes any conflicting Telegram-only requirements in the earlier sections of this specification.

### 12.1. Canonical submission flow

The canonical flow is:

**Visitor → public website form → Intake Edge Function → database → owner Telegram notification.**

The visitor stays on the ordinary website. A visitor must not be required to open Telegram, possess a Telegram account, authenticate through Telegram, launch a Telegram Mini App, or provide Telegram initData or a PIN.

Telegram is an owner-side notification and optional owner access channel only. It is not a required visitor interface. The existing Mini App may remain as an optional entry point to the same website form, but it must not create a separate submission or identity model.

### 12.2. Persistence is the source of truth

1. The backend validates the request and persists it before attempting notification delivery.
2. The persisted application is the canonical record used by every future interface.
3. Telegram notifications and the future Raymondovich Control Center “Заявки” area read/reference the same application ID and record. Neither channel creates a second application record.
4. Notification delivery state is separate from application lifecycle state. A Telegram delivery error must never delete or invalidate a successfully stored application.
5. Delivery must be retryable. Use a durable outbox/queue record with attempt count, next-attempt time, delivery status and bounded error code. A retry must not create a second application or send duplicate notifications after a confirmed delivery.

### 12.3. Application lifecycle and notification lifecycle

Application lifecycle status is independent of notification delivery status.

Application statuses: new, in_review, approved, rejected, closed.

Notification statuses: pending, sent, failed (with retry metadata maintained separately).

The future Control Center screen may update application status and append status history. Telegram notifications must not be treated as application status changes. Reading a Telegram message does not close an application.

### 12.4. Owner access contract

The future Control Center must query the same intake_applications records through a server-authorized owner-only interface. The current task does not include building its UI. The database must preserve owner scoping and deny anonymous/public reads and writes. Do not grant the browser direct anonymous access to application rows or notification outbox rows.

The Telegram bot is an owner notification surface. Any future Telegram commands for listing or changing applications must authenticate the configured owner chat server-side and use the same backend authorization and application IDs as Control Center.

### 12.5. Attribution contract

Support first-touch and last-touch attribution independently. Capture and validate the following untrusted marketing metadata when present: utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing page, referrer and capture timestamps. Preserve a normalized source label (including at least Telegram, Instagram, Threads, YouTube, VK, website, other) without requiring a database enum change for each new platform. Store first touch separately from last touch. Missing or invalid attribution must not block a submission and must normalize to direct/unknown as appropriate.

Attribution is a marketing hint, not verified identity or proof of provenance. Enforce strict length and character limits; do not trust client-supplied owner IDs, statuses, timestamps, notification states or source claims. Do not silently overwrite first-touch data when last-touch data changes.

Do not introduce persistent browser tracking beyond the approved privacy notice and consent model. If multi-visit first/last-touch persistence is required, use a privacy-reviewed first-party mechanism with bounded retention; do not assume localStorage/sessionStorage is automatically acceptable.

### 12.6. Public endpoint security

The public Edge Function remains verify_jwt=false only because the visitor is anonymous. It must independently enforce method, content type, request size, origin policy, schema validation, consent and notice version, idempotency, abuse/rate controls and server-side persistence. Telegram identity must not be a prerequisite or rate-limit key for website submissions. Do not trust client-supplied IP addresses. Keep database table and RPC privileges closed to anon; the Edge Function alone performs privileged writes using server-side credentials.

### 12.7. Consent and activation gate

Persist explicit consent timestamp and the exact notice/policy version identifier. Keep the existing legal-readiness gate closed. This architecture approval does not approve the legal notice, public activation, migration execution, secret changes, Edge Function deployment or frontend deployment.

### 12.8. Implementation order

- Add backward-compatible database support for anonymous website applications and attribution while preserving existing Telegram-originated records.
- Add durable notification outbox/retry semantics and keep application status separate from notification status.
- Update the Edge Function to accept website submissions without Telegram identity and notify the configured owner chat only after persistence.
- Update the website form to work in a normal browser while retaining the legal gate.
- Add automated tests for anonymous submission, idempotency, attribution, notification failure/retry and owner-only access.
- Implement the Control Center UI as a separate later vertical slice; its future data contract is defined here.

No production migration, deploy, secret update, public activation or legal-gate change is authorized by this amendment.

## 12.9. Implementation status amendment — Production DB foundation (2026-11-10)

After the owner separately authorized Production database changes and direct work on `main`, the database foundation was applied in Supabase project `yajybgdorhxebbigwjgi`. Applied migrations: `20261110161352`, `20261110161410`, `20261110161441`. The schema now supports website-originated applications without Telegram identity, separate application/notification statuses, first/last-touch JSONB, notice version, private outbox, status history and a service-role-only website RPC. Legacy Telegram RPCs remain in place. The corresponding SQL migration sources are present in the repository.

## 12.10. Implementation status amendment — website backend/frontend source (2026-11-10)

Added the source for `intake-website-submit`, a separate anonymous website endpoint; the existing Telegram `intake-submit` function was not replaced. Added and applied migration `20261110161956_add_intake_notification_delivery_rpc`, which lets the service role update outbox delivery state and schedule exponential retry metadata. The public form script and submit client now use the website-first endpoint and no longer require Telegram initData. The legal gate remains closed. The new Edge Function is not deployed and the frontend is not published. No production secrets or activation flags were changed.

Known incomplete requirements before public activation: robust abuse/rate limiting or a challenge; a scheduled outbox worker that claims due notifications and retries them automatically; setting the approved notice version server-side; Deno compilation, HTTP/Telegram end-to-end tests and browser/iPhone Safari QA. The honeypot and minimum form-duration check are supplemental filters, not sufficient rate limiting.


## 12.11. Implementation status amendment — Turnstile challenge (2026-11-10)

A Cloudflare Turnstile widget was created in managed mode for the approved website and local-development hostnames. The public sitekey is configured in the browser Intake module. The client renders action `intake_submit`, requires a token before enabling submission, and resets the widget after each request attempt. The `intake-website-submit` source validates each token through Siteverify and checks the returned action and hostname. It fails closed when `TURNSTILE_SECRET` is missing.

The secret has not been written to Git or Supabase. It must be provisioned as an Edge Function secret named `TURNSTILE_SECRET` from Cloudflare widget settings before deploying the function. The current Supabase connector does not expose a secret-write operation. The function remains undeployed; frontend remains unpublished; `INTAKE_ENABLED` and the legal gate remain unchanged. Deno, HTTP, browser and iPhone Safari tests have not been run. Turnstile is a challenge, not a strict request quota; scheduled outbox retry and legal/E2E readiness remain outstanding.


## 12.12. Outbox retry worker — source implementation (2026-11-10)

The repository now contains `supabase/functions/intake-notification-worker/index.ts`. It is a server-to-server endpoint protected by the dedicated `INTAKE_WORKER_SECRET` request header; Supabase JWT verification is disabled for this function because the scheduled caller authenticates with that independent secret. The worker:
- atomically claims a batch through the planned service-role-only RPC `intake_claim_notification_batch`;
- loads each application from `public.intake_applications` using the server key;
- sends the existing website Intake notification format to the configured owner chat;
- updates delivery state through `intake_set_notification_delivery`;
- records only bounded error codes and does not log application PII or credentials.

The worker batch is limited to 5 rows with a 180-second claim lock. The claim RPC must use `FOR UPDATE SKIP LOCKED`, set `locked_until`, and return application IDs only. To avoid racing the synchronous first-send path in `intake-website-submit`, the claim query must not claim a fresh `pending` row immediately: claim due `failed` rows and only stale `pending` rows older than two minutes. The RPC must be in the exposed `public` schema solely for PostgREST RPC routing, use an empty search_path, run as SECURITY INVOKER, and grant EXECUTE only to service_role. No anon/authenticated table or RPC access is permitted.

Delivery is at-least-once, not exactly-once. If Telegram accepts a message and the worker crashes before recording `sent`, the expired lock can lead to a duplicate retry. This limitation is inherent without an idempotency key supported by the Telegram sendMessage API.

**Not yet complete:** the claim RPC and pg_net installation/schedule are not in the database. Production currently has pg_cron and Vault installed; pg_net is available but not installed. A scheduled invocation should use pg_cron + pg_net and a Vault-held copy of the same worker secret, with a short cadence (for example, every minute). The Supabase CLI is unavailable in the current execution environment, so the required migration has not been generated or applied; the project migration workflow requires creating it with `supabase migration new`. The Edge Function is not deployed, and no worker secrets or cron jobs were created. Public Intake remains disabled.


### 12.12.1. Database claim primitive — applied in Production (2026-11-10)

Migration `20261110164405_add_intake_notification_claim_and_pg_net` is applied to Supabase project `yajybgdorhxebbigwjgi`. It installs pg_net 0.20.4 and adds `public.intake_claim_notification_batch(integer, integer)`. The function is SECURITY INVOKER with an empty search_path, bounds batch/lock parameters, uses `FOR UPDATE SKIP LOCKED`, sets `locked_until`, and returns application IDs only. EXECUTE is granted to service_role and denied to PUBLIC, anon and authenticated.

A rollback-only SQL smoke test passed: first claim succeeds, a second claim cannot take the locked row, and a row with an expired lock can be reclaimed. The transaction was rolled back; Production counts remain 0 applications / 0 outbox rows.

The pg_net extension catalog entry is reported in schema public by Supabase's extension metadata, while its HTTP functions are in schema net. Supabase Security Advisor emits `extension_in_public` WARN for this non-relocatable extension; no attempt was made to relocate or recreate it. Existing unrelated RLS-without-policy INFO findings and leaked-password-protection WARN remain unchanged.

The cron schedule is intentionally not created yet: it requires the worker to be deployed and the same `INTAKE_WORKER_SECRET` provisioned both as an Edge Function secret and in Vault. Public Intake remains disabled.
