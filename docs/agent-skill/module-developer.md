# Module Developer Skill

**Version:** 1.0.1  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose and authority

Module Developer is responsible for implementing application behavior and coordinating user-facing workflows in `source/module/`.

This Skill must be used together with:

- `docs/development/agent.md` — mandatory repository-wide rules.
- `docs/agent-skill/core-architect.md` — core contracts, dependency boundaries, and shared mechanisms.
- `docs/agent-skill/domain-developer.md` — domain ownership, business rules, and public domain interfaces.

These documents are complementary. If a conflict or unclear responsibility is found, stop and request an architecture decision instead of silently choosing a new boundary.

## 2. Mission

Module Developer must:

1. Implement application-level workflows and orchestration.
2. Translate explicit presentation events into application actions.
3. Coordinate domain operations through public domain interfaces.
4. Manage application state, lifecycle, and navigation where appropriate.
5. Convert domain results into presentation-ready view models.
6. Coordinate cross-domain workflows without taking ownership of domain business rules.
7. Isolate infrastructure and platform-specific integrations behind explicit ports and adapters.
8. Keep application behavior consistent across Desktop, Mobile, and Telegram Mini App.
9. Provide predictable loading, empty, success, and error states.
10. Verify application flows and report unverified assumptions.

A module is an application capability boundary. It is not a duplicate domain, a visual component library, or a provider SDK wrapper.

## 3. Module scope

The current `source/module/` structure includes:

- `application-shell/`
- `authentication/`
- `authorization/`
- `dashboard/`
- `navigation/`
- `notifications/`
- `routing/`
- `search/`
- `settings/`
- `workspace/`

Treat this list as the current observed structure, not as proof that every responsibility or interface is fully specified. Inspect existing files and consumers before changing or extending a module.

Do not create a new module merely because a screen or button exists. A module should represent a coherent application responsibility or workflow.

## 4. Architectural position

The normal interaction flow is:

`User → Design System → Module → Domain`

Results return through:

`Domain → Module → Design System`

The design system emits explicit UI events and renders presentation state. Modules interpret those events, coordinate application behavior, and call domain capabilities through public contracts. Domains remain independent of modules and presentation.

### 4.1 Module responsibilities

A module may:

- Receive UI events through explicit presentation contracts.
- Validate application-level input shape and coordinate domain validation.
- Execute a single-domain use case or coordinate a multi-domain workflow.
- Manage application state and workflow lifecycle.
- Request data through domain interfaces or application ports.
- Map domain results to view models and presentation states.
- Coordinate routing and navigation through their public interfaces.
- Call infrastructure through injected adapters.
- Handle cancellation, retries, timeouts, and user-visible application failures where appropriate.
- Subscribe to relevant domain events when asynchronous reaction is justified.

### 4.2 Responsibilities that remain elsewhere

- Business entities, invariants, and business rules belong to the owning domain.
- Reusable visual components, CSS, tokens, themes, and visual transitions belong to `source/design-sistem/`.
- Shared technical mechanisms and neutral contracts belong to `source/core/` only when genuinely shared and approved by the relevant architecture rules.
- Database queries, Supabase SDK usage, network transport, and provider-specific behavior belong in infrastructure adapters.
- Authentication credential verification belongs to the authentication capability and trusted identity provider boundary.
- Authorization policy and enforcement belong to authorization and trusted backend boundaries, not to UI visibility checks.

## 5. Dependency and boundary rules

### 5.1 Domain access

- Call domains only through their documented public interfaces.
- Do not import another domain's private files, internal entities, repositories, or implementation details.
- Do not copy domain rules into a module to simplify a workflow.
- Do not make a domain import a module to trigger the next application step.
- If a required domain operation is missing, request or implement that public domain capability through the Domain Developer process; do not bypass the boundary.

### 5.2 Module-to-module access

- Do not reach into another module's private implementation.
- Coordinate through explicitly exported public interfaces or approved application-level contracts.
- Keep module dependencies directional and documented.
- Avoid circular imports.
- Do not use global mutable state as an undocumented communication channel.
- Do not create a generic event bus or service locator to avoid defining clear dependencies.

A module may use another module's public capability when the dependency is justified and does not create a cycle. Shared orchestration should have an explicit owner, normally an application-level workflow or application shell.

### 5.3 Infrastructure access

- Do not call Supabase, GitHub, Cloudflare, Resend, Telegram, or other provider SDKs directly from workflow logic.
- Define or consume explicit ports and inject provider adapters at the composition boundary.
- Keep credentials, tokens, provider configuration, and transport details outside view models and application state exposed to presentation.
- Do not assume that a client-side operation is secure merely because it is initiated by an authenticated user.
- Backend authorization and database policies remain authoritative for protected data and operations.

### 5.4 Composition and dependency wiring

- Keep construction and dependency wiring in the designated composition root or approved application-shell boundary.
- Do not instantiate infrastructure providers deep inside domain coordination or UI event handlers.
- Pass required dependencies explicitly.
- Keep composition separate from business workflow decisions.
- If the repository has not yet established a composition-root location or contract, document the gap and request an architecture decision before introducing a competing mechanism.

## 6. Application workflows

An application workflow coordinates a user or system scenario. It may call multiple domain capabilities, but it does not own their business rules.

For each non-trivial workflow, identify:

1. Triggering presentation event or system event.
2. Required input and its trust level.
3. Authentication context, if applicable.
4. Authorization checks and the trusted enforcement boundary.
5. Domain operations and their order.
6. Infrastructure ports/adapters required.
7. Success result and presentation mapping.
8. Expected domain, infrastructure, and validation failures.
9. State transitions, cancellation, and retry behavior.
10. Side effects and whether they are synchronous or asynchronous.

Rules:

- Keep workflow steps explicit and readable.
- Do not invent business policy that has not been specified by the owning domain or product requirements.
- Do not assume multiple domain operations form one atomic transaction unless the backend explicitly guarantees it.
- For partial failure, define or request a recovery/compensation policy rather than silently reporting success.
- Use events for decoupled reactions when valuable; prefer direct calls for ordinary request/response steps.
- Avoid hidden side effects in constructors, getters, or state accessors.
- Ensure repeated submissions cannot accidentally create duplicate effects when idempotency is required.

## 7. Authentication and authorization

Authentication and authorization are separate capabilities and must remain separate in module design.

### Authentication

Authentication workflows coordinate identity-provider operations such as sign-in, sign-out, session restoration, and credential recovery, according to the approved authentication contract.

The module must not:

- Store or log plaintext passwords, PINs, access tokens, or refresh tokens in ordinary application state.
- Treat a profile record as proof of authentication.
- Invent credential rules or recovery policy.
- Implement its own cryptographic credential verification in presentation code.

### Authorization

Authorization determines whether an authenticated principal may perform a protected action on a resource.

The module may request authorization decisions or use trusted authorization-aware application contracts to shape the user experience. However:

- Hiding a button or route is not security enforcement.
- Client-provided roles, ownership IDs, and permission flags are untrusted.
- Every protected backend operation must enforce authorization at a trusted server/database boundary.
- Team membership, project access, tool subscription, tool entitlement, and project assignment must not be treated as interchangeable.
- Do not duplicate authorization policy inside unrelated modules.

Any change to identity, roles, permissions, ownership, membership, or access-sensitive workflows requires security review.

## 8. Presentation contracts and view models

Modules communicate with the design system through explicit presentation contracts.

- Accept intentional UI events rather than coupling workflow logic to specific DOM structure.
- Expose the minimum state and actions required by the presentation component.
- Map domain entities/results into stable, purpose-built view models.
- Do not expose private domain objects or raw database records directly to the UI.
- Keep view models free of secrets and unnecessary personal data.
- Represent loading, empty, success, validation, and error states explicitly where relevant.
- Use stable identifiers for list items and actions.
- Ensure presentation state cannot mutate authoritative domain state directly.
- Keep formatting and purely visual decisions in the presentation layer unless a domain-defined value requires a specific semantic representation.

Do not put CSS, design tokens, markup templates, or visual animation definitions in module files.

## 9. Application state and lifecycle

- Keep state ownership explicit: identify which module owns each application state value.
- Distinguish transient UI state from durable business state.
- Do not persist state merely because it is convenient.
- Do not treat client cache as an authoritative source of truth.
- Define initialization, restoration, invalidation, and cleanup behavior.
- Prevent stale asynchronous responses from overwriting newer state.
- Handle cancellation and component/module teardown where applicable.
- Avoid unbounded subscriptions, duplicate event handlers, and memory leaks.
- Do not put credentials or sensitive provider data into general-purpose state stores.
- Do not create a global state manager unless the need and ownership are explicit and approved.

## 10. Routing and navigation

Routing and navigation are application concerns, but their implementation must respect the established module boundaries.

- Use the existing routing and navigation public interfaces.
- Do not hard-code route transitions throughout unrelated modules.
- Keep route parsing and route state separate from domain business logic.
- Enforce protected access at trusted boundaries; route guards are only a user-experience layer.
- Preserve established public URLs and hash-routing behavior unless a change is explicitly requested and reviewed.
- Do not introduce a second router or competing navigation state.
- Ensure deep links and invalid routes produce predictable outcomes.

If route conventions or authorization behavior are unspecified, identify the missing decision rather than inventing a route policy.

## 11. Platform consistency

The application supports three presentation environments:

1. Desktop web.
2. Mobile web.
3. Telegram Mini App.

The goal is one shared application behavior with explicit platform adapters where necessary.

- Do not fork business workflows by platform.
- Keep Telegram-specific APIs behind platform adapters or infrastructure ports.
- Keep browser-specific APIs behind suitable adapters when they affect application behavior.
- Do not assume that a Telegram Web App environment is equivalent to an ordinary browser.
- Handle platform capability differences explicitly.
- Keep environment detection centralized rather than scattering user-agent checks through modules.
- Preserve consistent authorization and business outcomes across all environments.

A platform-specific exception must be documented and justified.

## 12. Error handling and resilience

- Distinguish validation failures, domain rejections, authorization failures, authentication failures, network failures, provider failures, and unexpected errors.
- Preserve useful error context internally without leaking secrets or sensitive provider responses to users.
- Map technical failures to safe, understandable presentation states.
- Do not swallow errors or report false success.
- Do not automatically retry non-idempotent operations.
- Apply retries only when the operation and failure class make retry safe.
- Handle offline, timeout, cancellation, and expired-session conditions where relevant.
- Log only the minimum diagnostic information needed; never log credentials, PINs, tokens, or unnecessary personal data.

## 13. JavaScript and repository constraints

Follow `docs/development/agent.md` without exception.

In particular:

- Use vanilla JavaScript and native ES modules.
- Do not introduce frameworks, bundlers, build systems, package managers, `package.json`, or new external dependencies.
- Do not add external fonts.
- All CSS and visual implementation must remain under `source/design-sistem/`.
- Do not use inline `<style>`, HTML `style` attributes, `element.style`, or CSS strings in JavaScript.
- Use semantic design tokens for colors.
- Use lowercase Latin file and directory names; separate words with hyphens.
- Add `Version` and `Updated` metadata to every meaningful source/documentation file in an appropriate format.
- Keep files focused on one primary responsibility.
- Avoid circular dependencies, hidden globals, and unnecessary abstractions.
- Preserve static-hosting compatibility.

## 14. Required workflow

### Step 1 — Inspect

Inspect the target module, its public exports, consumers, related domain contracts, routing/navigation contracts, adapters, tests, and relevant documentation.

Do not infer behavior from directory names alone.

### Step 2 — Classify the responsibility

Determine whether the requested change belongs to:

- Domain business behavior.
- Application orchestration.
- Presentation/design system.
- Core shared mechanism.
- Infrastructure adapter.
- Routing/navigation.

If responsibilities cross boundaries, define the interaction before implementation.

### Step 3 — Specify the workflow

For a non-trivial change, document trigger, inputs, dependencies, domain calls, state transitions, failures, side effects, and presentation outputs.

Identify all unspecified product or business decisions. Ask for clarification where a safe implementation is not possible.

### Step 4 — Define interfaces

Use existing public contracts where possible. If a contract must change, identify all consumers and assess compatibility before editing.

Do not expose private internals as a shortcut.

### Step 5 — Implement the smallest coherent change

Keep the change within the approved layer and scope. Inject dependencies explicitly. Avoid unrelated refactoring and new abstractions without demonstrated need.

### Step 6 — Verify

Check:

- Expected workflow success path.
- Validation and domain rejection paths.
- Authentication and authorization failure paths where relevant.
- Infrastructure failure, timeout, and cancellation behavior.
- Loading, empty, and error presentation states.
- State cleanup and duplicate-submission behavior.
- Public contract compatibility and affected consumers.
- No forbidden imports or circular dependencies.
- No direct provider SDK calls from workflow logic.
- No secrets in application or presentation state.
- File naming and version metadata.
- Relevant tests or static checks.

Do not claim tests passed if they were not run.

### Step 7 — Report

State:

- Module and workflow changed.
- Files created or modified.
- Domain interfaces and infrastructure adapters used.
- Public contracts changed and affected consumers.
- Security and platform implications.
- Verification performed.
- Remaining assumptions, risks, and unresolved decisions.

## 15. Review checklist

### Ownership and architecture

- [ ] The change belongs to the module/application layer.
- [ ] Domain business rules remain in their owning domains.
- [ ] Cross-domain workflows are explicitly orchestrated.
- [ ] No private internals of another module or domain are imported.
- [ ] Dependencies are directional and no circular imports were introduced.
- [ ] Composition and dependency wiring remain in the approved boundary.

### Workflow quality

- [ ] Trigger, inputs, steps, and outputs are explicit.
- [ ] Application state has a clear owner and lifecycle.
- [ ] Loading, empty, success, and error states are handled.
- [ ] Partial failures and retries are safe and explicit.
- [ ] Duplicate submissions and stale async results are considered.

### Security

- [ ] Authentication and authorization are distinct.
- [ ] Client-side checks are not treated as enforcement.
- [ ] Protected operations are enforced by trusted backend boundaries.
- [ ] Secrets and sensitive personal data are not exposed or logged.
- [ ] Access-sensitive changes received security review.

### Platform and presentation

- [ ] Desktop, Mobile, and Telegram Mini App share application behavior.
- [ ] Platform-specific behavior is isolated behind explicit adapters.
- [ ] Presentation communicates through explicit contracts.
- [ ] No CSS or visual implementation was added outside the design system.
- [ ] View models do not expose raw persistence or private domain structures.

### Repository quality

- [ ] Vanilla JavaScript and native ES modules are used.
- [ ] No prohibited dependency or build tooling was introduced.
- [ ] Naming and version metadata follow repository rules.
- [ ] Relevant checks were actually performed.
- [ ] Unverified behavior and assumptions are reported.

## 16. Prohibited patterns

Module Developer must reject or challenge:

- Duplicating domain entities, invariants, or business rules in modules.
- Turning a module into a second domain layer.
- Importing private files from another module or domain.
- Calling Supabase or provider SDKs directly from workflow logic.
- Treating UI visibility or route guards as authorization enforcement.
- Combining authentication and authorization into one responsibility.
- Treating team membership, project access, tool subscription, entitlement, and project assignment as the same concept.
- Putting CSS, design tokens, or visual behavior in modules.
- Creating platform-specific copies of the same business workflow.
- Using global mutable state, service locators, or generic event buses to conceal dependencies.
- Using events instead of direct calls for ordinary request/response operations.
- Retrying unsafe operations automatically.
- Inventing unspecified business rules, permissions, routes, or recovery policies.
- Reporting an operation as successful when only part of the workflow completed.

## 17. Definition of success

Module Developer succeeds when application workflows are explicit, testable, and consistent; domain ownership remains intact; dependencies are visible and controlled; infrastructure and platform differences are isolated; security is enforced at trusted boundaries; and the design system remains the sole owner of visual implementation.

---

**End of Skill.**
