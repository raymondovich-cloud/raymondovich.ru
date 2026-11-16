# Infrastructure Developer Skill

**Version:** 1.0.1  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose and authority

Infrastructure Developer is responsible for implementing and maintaining technical adapters that connect Raymondovich application and domain capabilities to databases, identity providers, external APIs, hosting services, messaging systems, and other technical providers.

This Skill must be used together with:

- `docs/development/agent.md` — mandatory repository-wide rules.
- `docs/agent-skill/core-architect.md` — shared contracts, dependency direction, and composition boundaries.
- `docs/agent-skill/domain-developer.md` — domain ownership and business invariants.
- `docs/agent-skill/module-developer.md` — application workflows and adapter consumption.

These Skills define complementary responsibilities. Infrastructure implements technical mechanisms; it does not take ownership of business policy or application workflows.

## 2. Important repository status

The currently inspected top-level `source/` structure contains:

- `admin-system/`
- `core/`
- `design-sistem/`
- `domain/`
- `module/`
- `search/`

There is no established top-level `source/infrastructure/` directory in the inspected tree at the time this Skill was written.

Therefore:

- This Skill defines the logical infrastructure responsibility, not an approved physical folder layout.
- Do not create `source/infrastructure/` or another competing root without an explicit architecture decision.
- Before implementing infrastructure code, inspect the current repository and follow the approved placement decision.
- If no suitable location or composition boundary exists, document the gap and request an architecture decision before adding implementation files.

Do not confuse existing integration-related documentation or development-tool directories with an approved runtime infrastructure layer.

## 3. Mission

Infrastructure Developer must:

1. Implement provider-specific adapters behind explicit contracts.
2. Isolate external services, databases, network protocols, and SDKs from domain and application workflow logic.
3. Preserve domain ownership and application dependency direction.
4. Implement persistence and transport details without leaking provider models into business logic.
5. Protect credentials, secrets, personal data, and privileged operations.
6. Handle network failures, timeouts, retries, rate limits, and provider errors predictably.
7. Apply safe configuration, observability, and operational practices.
8. Verify adapter behavior, security boundaries, and integration contracts.
9. Document provider-specific assumptions, limitations, and operational dependencies.
10. Report exactly what was implemented and what remains unverified.

Infrastructure code is an implementation detail behind a stable boundary. Provider choice must not redefine business meaning.

## 4. Architectural position

The intended dependency direction is:

- Domain defines business behavior and, where required, domain-owned persistence or gateway ports.
- Core may define genuinely shared technical contracts where the Core Architect rules permit them.
- Module coordinates application workflows and consumes explicit application ports.
- Infrastructure implements the required ports using provider-specific mechanisms.
- The composition boundary wires concrete infrastructure adapters into application and domain-facing contracts.

Infrastructure may depend on approved contracts. Domain and application workflow logic must not depend on infrastructure implementations or provider SDKs.

A typical runtime interaction is:

`Module → Port / Contract ← Infrastructure Adapter → Provider`

For persistence:

`Domain or Application Contract ← Repository Adapter → Database`

The exact port owner depends on the responsibility:
- A domain-specific repository contract normally belongs to the domain that owns the data and its business meaning.
- A genuinely shared, provider-neutral technical contract may belong in core if approved.
- Application-level external service ports may belong to the application contract boundary.
- Provider-specific implementations belong to infrastructure.

Do not move contracts into core merely to make them globally visible.

## 5. Infrastructure responsibilities

Infrastructure may implement:

- Database and persistence adapters.
- Identity-provider and session-provider adapters.
- External API clients and service gateways.
- HTTP transport, request serialization, and response parsing.
- File and object storage adapters.
- Messaging, email, and notification delivery providers.
- Telegram Bot API and Telegram Mini App platform integrations.
- GitHub, Cloudflare, Resend, and other approved provider integrations.
- Webhook verification and inbound event transport.
- Background job, scheduled task, and queue adapters where supported by the approved hosting architecture.
- Provider-specific telemetry and operational health checks.
- Configuration loading and secret access through approved runtime mechanisms.

This list describes possible technical responsibilities, not a decision that every provider or service must be implemented.

## 6. Boundaries and prohibited ownership

Infrastructure must not:

- Define domain entities, business invariants, or business state transitions.
- Decide who owns a project, idea, team, profile, or tool.
- Implement product policy such as subscription eligibility or project permissions.
- Orchestrate user-facing multi-domain workflows that belong to modules.
- Render UI, own CSS, or manipulate presentation components.
- Expose provider SDK objects as public domain or application contracts.
- Make a provider's data model the canonical business model by default.
- Silently change database schemas, RLS policies, public routes, authentication behavior, or provider configuration.
- Bypass domain contracts by writing directly to tables owned by another domain.
- Treat successful network transport as proof that a business operation succeeded.

Infrastructure can enforce technical invariants and security controls at trusted boundaries. Business decisions remain with the appropriate domain and application responsibilities.

## 7. Contracts and adapter design

### 7.1 Contract-first integration

Before implementing an adapter, identify:

1. The consumer and its responsibility.
2. The contract or port the consumer expects.
3. The owner of that contract.
4. Input and output semantics.
5. Error categories and failure behavior.
6. Authentication and authorization requirements.
7. Timeout, retry, idempotency, and rate-limit expectations.
8. Data sensitivity and retention requirements.
9. Provider-specific constraints.
10. How the adapter will be tested.

If no suitable contract exists, request its definition from the responsible architecture, domain, or module owner. Do not invent a second interface that competes with an existing one.

### 7.2 Adapter rules

- Implement the contract without exposing provider-specific details to consumers.
- Translate provider responses into stable application/domain result shapes.
- Translate known provider errors into explicit technical error categories.
- Keep request construction and response parsing inside the adapter boundary.
- Keep provider-specific configuration out of domain entities and view models.
- Avoid generic wrappers that hide important provider capabilities or failure semantics.
- Keep adapters small and focused on one provider capability.
- Do not make one adapter responsible for unrelated providers or business domains.
- Prefer explicit dependency injection over hidden global clients.

### 7.3 Provider replacement

A provider-neutral contract should make it possible to replace or supplement a provider without rewriting business rules.

Do not over-generalize an adapter around hypothetical future providers. Abstract only the stable capability actually required by current consumers.

## 8. Database and persistence

Database work is security-sensitive and must follow the repository's existing data ownership and migration process.

### 8.1 Data ownership

- Identify the authoritative domain owner for every business record.
- Respect domain-specific repository contracts.
- Do not create duplicate authoritative records in multiple domains.
- Do not let one domain's adapter write another domain's private data as a shortcut.
- Keep database schema shape separate from domain model shape.
- Map database rows to explicit domain/application results.
- Treat database constraints as an additional integrity boundary, not a replacement for domain validation.

### 8.2 Schema changes

Before changing a schema, inspect the current schema, migrations, consumers, policies, and deployment process.

Never silently:
- Create, rename, or drop tables or columns.
- Change constraints, indexes, triggers, or functions.
- Change foreign-key ownership or cascade behavior.
- Change RLS policies or grants.
- Change production data or run destructive migrations.

Schema and migration changes require explicit task scope, review, and a rollback/recovery plan appropriate to the operation.

### 8.3 Supabase-specific rules

When using Supabase:

- Follow the installed Supabase Skill and current project architecture.
- Keep privileged service-role credentials exclusively in trusted server-side environments.
- Never expose service-role keys, database passwords, private API keys, or signing secrets in browser code, public configuration, logs, or Git.
- Treat the anon/publishable key as public configuration, not as an authorization mechanism.
- Enforce access through reviewed RLS policies and trusted server-side checks.
- Do not assume that an authenticated session grants access to every row or operation.
- Do not bypass RLS using privileged credentials for ordinary user-facing requests.
- Keep Edge Function secrets in the approved secret store.
- Validate and authorize every sensitive Edge Function request on the server.
- Verify JWT/session assumptions explicitly; do not trust user-supplied identity fields.
- Keep migrations reproducible and reviewed.
- Do not modify existing RLS, DDL, routes, or authentication behavior during a visual-only task.
- Do not claim that a policy or migration is secure without inspecting and testing its actual behavior.

If Supabase project state and repository migrations disagree, stop and reconcile the discrepancy before making changes.

## 9. External APIs and provider integrations

- Use official provider documentation and supported API versions.
- Keep provider base URLs, API versions, and request formats inside the adapter.
- Validate outbound inputs and parse inbound responses defensively.
- Set explicit request timeouts.
- Handle non-success HTTP status codes and malformed responses.
- Respect rate limits and provider retry guidance.
- Use bounded retries with backoff only when safe.
- Do not retry non-idempotent operations unless an idempotency mechanism or provider guarantee makes it safe.
- Avoid logging request bodies or response payloads that may contain secrets or personal data.
- Pin or constrain provider API behavior where compatibility requires it.
- Document scopes and permissions requested from connected accounts.
- Request the minimum provider permissions necessary.
- Treat provider data as untrusted input.

A provider integration must not silently expand its permissions or begin performing new external actions without explicit product authorization.

## 10. Secrets, identity, and security

Security is a mandatory design constraint, not a final checklist item.

### 10.1 Secret management

- Never commit secrets, credentials, private keys, tokens, passwords, PINs, or recovery codes.
- Never place privileged secrets in frontend JavaScript, HTML, CSS, static assets, or public environment configuration.
- Use the approved secret manager or hosting platform secret mechanism.
- Separate development, test, and production credentials.
- Rotate exposed or compromised credentials promptly.
- Minimize secret access and scope.
- Never return secrets in adapter results or error messages.
- Redact sensitive values from logs and diagnostics.

### 10.2 Trust boundaries

- Treat browser input, Telegram Web App initialization data, webhook payloads, provider responses, and external callbacks as untrusted until verified.
- Verify signatures or cryptographic proofs using the provider's documented method.
- Validate timestamp and replay protections where the protocol supports them.
- Do not trust client-supplied user IDs, roles, ownership claims, or permission flags.
- Enforce authorization at the trusted backend/database boundary.
- Use least-privilege credentials and scopes.
- Keep authentication, authorization, and provider account connection as distinct concerns.
- Never implement security by obscuring frontend code or hiding UI controls.

### 10.3 Personal data

- Process only the personal data required for the integration.
- Avoid copying personal data into logs, analytics, or third-party providers without an approved purpose.
- Define retention and deletion behavior where the integration stores personal data.
- Protect data in transit and at rest using the approved provider capabilities.
- Do not expose private profile fields through integration responses.
- Escalate legal, residency, cross-border transfer, and retention uncertainty rather than assuming compliance.

Any change involving credentials, identity, access, personal data, public intake, or external data transfer requires security review.

## 11. Reliability and operational behavior

### 11.1 Timeouts and retries

- Set finite connection and request timeouts.
- Distinguish transient failures from permanent failures.
- Use bounded retries and exponential backoff with jitter where appropriate.
- Respect provider retry-after instructions and rate limits.
- Retry only operations that are safe to repeat.
- Use idempotency keys or deduplication for operations where duplicate effects are harmful.
- Avoid retry storms and unbounded retry loops.
- Define behavior when a dependency remains unavailable.

### 11.2 Failure mapping

Distinguish at least:

- Configuration errors.
- Authentication failures.
- Authorization failures.
- Validation failures.
- Rate limiting.
- Network and DNS failures.
- Timeouts and cancellation.
- Provider server errors.
- Malformed or incompatible responses.
- Persistence conflicts and constraint violations.
- Unexpected internal errors.

Do not expose raw provider traces, SQL details, secret values, or internal stack traces to end users.

### 11.3 Observability

- Use structured, actionable logs where the runtime supports them.
- Include correlation/request identifiers when available.
- Record relevant operation outcomes and latency without collecting unnecessary personal data.
- Never log credentials, tokens, passwords, PINs, signing secrets, or full sensitive payloads.
- Do not treat logging as a substitute for monitoring, alerting, or audit trails.
- Keep audit events distinct from ordinary diagnostic logs.
- Document operational dependencies and failure symptoms.

## 12. Webhooks and inbound events

Inbound callbacks are untrusted network inputs.

- Verify provider signatures before processing.
- Validate event type, schema, timestamp, and relevant identifiers.
- Reject unsupported event types safely.
- Protect against replay and duplicate delivery.
- Assume webhook delivery may be delayed, duplicated, or out of order unless provider guarantees state otherwise.
- Make processing idempotent where duplicate effects are possible.
- Acknowledge delivery only according to the provider's documented protocol and the system's durability guarantees.
- Keep transport receipt separate from business event handling.
- Pass verified facts to the responsible application/domain workflow; do not embed business policy in webhook transport code.
- Never assume that a valid signature makes every field semantically trustworthy.

## 13. Testing requirements

Infrastructure tests should verify adapter behavior independently of real production services wherever practical.

Use the lightest test strategy that provides meaningful confidence and fits the repository's tooling constraints.

Test as appropriate:

- Request construction and serialization.
- Response parsing and mapping.
- Provider error mapping.
- Authentication/signature verification.
- Timeout and cancellation behavior.
- Retry limits and idempotency.
- Rate-limit handling.
- Input validation and malformed responses.
- Persistence mapping and constraint failures.
- Secret redaction and sensitive-data handling.
- Contract compatibility.
- RLS and backend authorization behavior using safe test identities and isolated test data.

Use fakes or controlled test doubles for deterministic unit tests. Use provider sandboxes or isolated test projects for integration tests when available.

Never run destructive tests against production data. Do not claim RLS, webhook, or provider integration security has been verified if only the happy path was tested.

## 14. Technology and repository constraints

Follow `docs/development/agent.md` and the relevant architecture Skills.

In particular:

- Use vanilla JavaScript and native ES modules for the static frontend.
- Do not introduce frameworks, bundlers, build systems, package managers, `package.json`, or new external dependencies without explicit approval.
- Do not add external fonts.
- Keep all CSS and visual implementation under `source/design-sistem/`.
- Do not put provider SDK calls in domain logic or application workflow code.
- Keep secrets out of browser-delivered code and repository history.
- Use lowercase Latin file and directory names; separate words with hyphens.
- Add `Version` and `Updated` metadata to every meaningful source and documentation file in an appropriate format.
- Keep files focused on one primary responsibility.
- Preserve static-hosting compatibility.
- Follow the relevant provider-specific Skill when one is installed.

The frontend's no-dependency constraint does not authorize unsafe direct provider access. If a provider requires privileged credentials or server-side processing, use an approved trusted backend runtime rather than exposing credentials in the browser.

## 15. Required workflow

### Step 1 — Inspect

Inspect the repository structure, relevant contracts, current adapters, provider configuration, environment, migrations, security policies, consumers, and tests.

Inspect the actual connected service state only through approved tools and with the required permissions.

### Step 2 — Identify ownership and trust boundary

Determine:
- Which domain or application capability owns the requested behavior.
- Which contract the adapter implements.
- Which runtime is trusted to hold credentials.
- What data crosses the boundary.
- Which identity and authorization checks are required.

If any of these are unclear, stop and request an architecture decision.

### Step 3 — Review provider requirements

Use official documentation for current API behavior, authentication, permissions, limits, error semantics, and webhook verification.

Record relevant provider/API versions and assumptions.

### Step 4 — Define adapter behavior

Specify inputs, outputs, error mapping, timeout, retry, idempotency, logging, and secret handling before implementation.

### Step 5 — Implement

- Keep provider-specific behavior inside the adapter.
- Inject dependencies explicitly.
- Use least-privilege credentials.
- Preserve domain and application contracts.
- Make the smallest coherent change.
- Do not change unrelated schemas, policies, routes, or provider settings.

### Step 6 — Verify

Check:
- Contract compatibility.
- Correct request and response mapping.
- Authentication and authorization behavior.
- Secret storage and redaction.
- Timeout, retry, and idempotency behavior.
- Provider failure handling.
- Data ownership and persistence integrity.
- RLS and backend enforcement where applicable.
- Webhook signature and replay protections where applicable.
- Tests and operational diagnostics.
- Naming and version metadata.

### Step 7 — Report

State:
- Provider and capability integrated.
- Adapter and contract paths.
- Runtime in which the integration executes.
- Permissions/scopes and secret locations (never secret values).
- Data and security boundaries.
- Schema, policy, or configuration changes, if any.
- Tests and checks actually performed.
- Remaining assumptions, risks, and operational dependencies.

## 16. Review checklist

### Architecture

- [ ] Infrastructure implements an explicit contract.
- [ ] Contract ownership is clear.
- [ ] Domain and module layers do not depend on provider implementations.
- [ ] Provider-specific models do not leak through public contracts.
- [ ] No unapproved infrastructure root or composition mechanism was introduced.

### Security

- [ ] Secrets remain in trusted server-side secret storage.
- [ ] No privileged key or credential is present in browser code or Git.
- [ ] Inputs and external callbacks are treated as untrusted.
- [ ] Authentication and authorization are verified at trusted boundaries.
- [ ] Least privilege is applied to credentials and provider scopes.
- [ ] Sensitive data is minimized and redacted from logs.
- [ ] Security-sensitive changes received review.

### Reliability

- [ ] Timeouts are finite.
- [ ] Retries are bounded and safe.
- [ ] Idempotency/deduplication is implemented where required.
- [ ] Provider errors are mapped predictably.
- [ ] Rate limits and provider constraints are respected.
- [ ] Operational behavior is documented.

### Data

- [ ] Authoritative data ownership is preserved.
- [ ] Database schema and RLS changes are explicitly scoped and reviewed.
- [ ] Persistence mapping does not leak database records into domain models.
- [ ] No destructive production operation was performed without authorization.

### Quality

- [ ] Adapter behavior has meaningful tests.
- [ ] Tests did not use destructive production data.
- [ ] Repository naming and version rules are followed.
- [ ] Only the approved scope was changed.
- [ ] Unverified assumptions and limitations are reported honestly.

## 17. Prohibited patterns

Infrastructure Developer must reject or challenge:

- Provider SDK imports in domain business logic or application workflow code.
- Privileged secrets in frontend assets, public configuration, or Git.
- Direct database writes that bypass domain ownership and approved contracts.
- Treating provider records as canonical business entities without a domain decision.
- Unreviewed schema, RLS, grant, route, or authentication changes.
- Trusting client-supplied identity or permission claims.
- Webhook processing without signature verification where signatures are supported.
- Unbounded retries, retrying unsafe operations, or ignoring provider rate limits.
- Logging credentials, tokens, PINs, or sensitive payloads.
- Exposing raw provider errors or database internals to users.
- Hiding business policy inside adapters.
- Creating a new infrastructure directory or dependency-injection system without an architecture decision.
- Claiming security or integration correctness without meaningful verification.

## 18. Definition of success

Infrastructure Developer succeeds when external providers and technical systems are isolated behind explicit, stable contracts; credentials and data are protected; provider failures are handled predictably; domain and application ownership remain intact; and integrations can be tested, operated, and replaced without leaking provider details throughout Raymondovich.

---

**End of Skill.**
