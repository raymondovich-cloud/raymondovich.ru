# Authentication and System Email

**Version:** 1.0.0  
**Updated:** 2026-11-16  
**Status:** Active — SMTP dashboard configuration pending

## 1. Purpose

This document describes the platform authentication flow and its system-email dependency. Platform Supabase and Resend integrations belong to Infrastructure and must remain separate from user-managed integrations under `source/domain/tools/integration-services/`.

## 2. Providers and ownership

- **Supabase Auth** is the identity provider and issues user sessions.
- **Supabase Postgres** owns authentication-related profile records and registration constraints.
- **Resend** delivers transactional authentication messages through the Supabase Auth SMTP connection.
- The browser receives only the Supabase publishable key. Service-role and Resend credentials must never be included in frontend code or repository files.

## 3. Existing Supabase implementation

The active Supabase project is `raymondovich` in region `eu-central-1`.

The existing database implementation already contains:

- `private.user_profiles` — private profile fields: full name, birth date and normalized username.
- `private.auth_settings` — registration gate.
- An Auth trigger that assigns the default `USER` application role.
- An Auth trigger that creates the private profile from signup metadata and clears the temporary user metadata.
- A database registration gate.
- `lookup_auth_user_for_username` for username-to-user lookup.
- Edge Function `username-sign-in` for username/password authentication.
- Edge Function `profile-update` for authenticated profile reads and updates.
- Edge Function `pin-auth` for the separate PIN verification flow.

At the time of this document, `private.auth_settings.registration_enabled` is `true`. No database schema or RLS changes are part of the frontend authentication integration.

## 4. Browser authentication flow

The static frontend uses native ES modules and the Supabase Auth HTTP API. No frontend framework, bundler, package manager or additional runtime dependency is introduced.

Implementation boundaries:

- `source/infrastructure/supabase/auth-client.js` — Auth HTTP adapter, session persistence and token refresh.
- `source/module/authentication/authentication.js` — registration, login, recovery, callback and sign-out workflows.
- `source/design-sistem/authentication-view.js` — authentication presentation and UI events.
- `source/design-sistem/authentication.css` — authentication styles.

Supported flows:

1. Registration with full name, birth date, username, email and password.
2. Email/password sign-in.
3. Username/password sign-in through `username-sign-in`.
4. Email confirmation callback.
5. Password recovery and password update.
6. Session refresh and sign-out.

Signup metadata keys must remain exactly `full_name`, `birth_date` and `username`; the database trigger depends on these names.

The frontend must not assign roles or treat client-provided metadata as authorization. Authorization remains enforced by trusted backend logic and database policies.

## 5. Resend SMTP configuration

The Resend sending domain is `mail.raymondovich.ru`. It is verified, sending is enabled, and open/click tracking are disabled.

A dedicated Resend API key named `raymondovich-supabase-auth` has been created with `sending_access` permission restricted to that sending domain. The token is a secret and must be entered only in Supabase Auth SMTP settings. Never commit it to GitHub, frontend code, documentation, or browser storage.

Configure the active Supabase project in **Authentication → SMTP Settings**:

| Setting | Value |
| --- | --- |
| Enable Custom SMTP | On |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | The dedicated Resend API key |
| Sender email | `no-reply@mail.raymondovich.ru` |
| Sender name | `Raymondovich` |

Keep email confirmations enabled and automatic email confirmation disabled. Do not disable verification to make testing easier.

Resend's SMTP credentials and supported ports are documented at its official SMTP service documentation.

## 6. Supabase URL and email configuration

For development testing, add these redirect patterns to **Authentication → URL Configuration → Redirect URLs**:

- `https://dev.raymondovich.ru/**`
- `https://r-ru-development.pages.dev/**`

Do not replace the existing production Site URL with the development domain. The frontend explicitly supplies its current origin as the redirect destination.

The Confirm Signup and Reset Password templates must retain Supabase's confirmation URL/token variables and must not rewrite or remove the `redirect_to` destination. Keep Resend open and click tracking disabled so authentication links are not modified.

## 7. Required verification

After SMTP and redirect configuration:

1. Register a test account on `https://dev.raymondovich.ru/#register`.
2. Confirm that the confirmation email is received from `no-reply@mail.raymondovich.ru`.
3. Open the confirmation link and verify that the browser returns to the development domain and establishes a session.
4. Sign out and test sign-in by email.
5. Sign out and test sign-in by username.
6. Request a password reset, open the email link, set a new password and sign in again.
7. Review the Auth logs and Resend email events for delivery errors.

Do not use real public registration until the project's separate legal and privacy launch requirements are satisfied.
