# Intake Module Specification

> **Project:** Raymondovich.ru  
> **Document:** Intake Module Specification  
> **Version:** 1.2  
> **Status:** Draft for implementation review  
> **Date:** 2026-11-10

## 1. Purpose

Intake receives requests from visitors who open the Raymondovich Telegram Mini App. The initial release supports one application form and three interest categories. It records an attribution label, stores the request, and sends a notification to the owner through Telegram Bot API.

Intake is a request intake channel, not an account registration mechanism and not proof of a contractual relationship.

## 2. Scope

Included:
- Telegram Mini App launch through the existing platform bootstrap and bridge.
- Attribution labels `tg`, `ig`, `threads`, `site`, optionally followed by a campaign suffix.
- Server-side validation of raw Telegram `initData`.
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
- `message`: required, 1–1000 characters.
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
