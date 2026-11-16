# Development Agent Rules

**Version:** 1.0.2  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose

This document defines mandatory architecture, implementation, design, security, and repository rules for every human developer and AI agent working on Raymondovich.

The goal is to keep the codebase modular, predictable, testable, secure, and maintainable as the ecosystem grows.

These rules apply to all work in this repository. A task-specific instruction may narrow the scope, but must not silently violate these rules. If a requirement conflicts with this document, stop and identify the conflict before changing files.

## 2. Mandatory working principles

1. Inspect the existing repository structure and relevant files before making changes.
2. Understand the responsibility of the target layer before adding code.
3. Make the smallest coherent change that fully solves the task.
4. Do not create abstractions, folders, services, or dependencies without a concrete need.
5. Do not duplicate business rules, domain entities, or application flows across layers.
6. Do not silently change public interfaces, database schemas, access policies, routes, or integration behavior.
7. Preserve existing working behavior unless the task explicitly requires changing it.
8. Verify every change and report what was changed, what was checked, and what remains unverified.
9. If the repository does not provide enough information to implement a requirement safely, ask for clarification instead of inventing assumptions.
10. Never claim that a change, test, deployment, or integration was completed unless it was actually performed and verified.

## 3. Technology constraints

The project uses a deliberately lightweight frontend architecture.

- Use vanilla JavaScript with native ES modules.
- Do not introduce frontend frameworks or libraries.
- Do not introduce bundlers, build systems, or package managers.
- Do not add `package.json` or external runtime dependencies.
- Do not add external fonts.
- Prefer browser-native APIs and platform capabilities.
- Keep modules compatible with the project's static hosting and deployment model.
- Any proposed exception must be discussed and explicitly approved before implementation.

Do not add a dependency merely to avoid writing a small, understandable native implementation.

## 4. Repository naming and file rules

### 4.1 Naming

- All directory and file names must use lowercase Latin characters.
- Separate words with hyphens (`-`), never spaces.
- Use descriptive names that communicate responsibility.
- Do not create multiple names for the same concept.
- Preserve established directory names, including `design-sistem`.

### 4.2 File versions

Every meaningful source file and documentation file must declare its version and last update date in a format appropriate to that file type.

Use this metadata convention:

- `Version: MAJOR.MINOR.PATCH`
- `Updated: YYYY-MM-DD`

For example, Markdown files use the metadata near the top of the document. JavaScript, CSS, and HTML files use an appropriate comment. Do not add invalid comments to formats that do not support comments.

Versioning rules:

- PATCH: correction, refactoring, or compatible internal change.
- MINOR: backward-compatible functionality or contract addition.
- MAJOR: breaking interface, behavior, or structural change.
- Update the version whenever the file content changes.
- Do not reset or arbitrarily decrease a file's version.
- Technical placeholders such as `.gitkeep`, generated artifacts, and formats that cannot safely contain metadata are exempt.

A version in a file does not replace Git history or commit history.

### 4.3 File scope

- One file should have one clear primary responsibility.
- Avoid oversized files that combine unrelated concerns.
- Do not create empty implementation files as a substitute for an architecture decision.
- Use `.gitkeep` only when an otherwise empty directory must be tracked by Git.

## 5. Architectural layers

The main application architecture is divided into four responsibility areas: `domain`, `module`, `design-sistem`, and `core`.

These areas are not interchangeable. Do not move code between them merely for convenience.

### 5.1 Domain — business capabilities

Location: `source/domain/`

The domain layer contains the ecosystem's subject areas and their business behavior.

Examples of existing domain areas:

- `profile/`
- `ideas/`
- `team/`
- `tools/`
- `project/`
- `ecosystem-algorithms/`

A domain may contain:

- Domain entities and value objects.
- Business rules and invariants.
- Domain operations and use cases where they belong to that domain.
- Domain-specific validation.
- Domain-specific repository contracts where required.
- Domain events describing meaningful business facts.

A domain must:

- Own the meaning and rules of its business data.
- Expose explicit interfaces for operations needed by other layers.
- Avoid depending on browser UI, DOM, CSS, or Telegram presentation APIs.
- Avoid importing application modules or design-system components.
- Avoid directly depending on another domain's internal implementation.

A domain must not become a generic storage location for unrelated helpers.

### 5.2 Module — application behavior and orchestration

Location: `source/module/`

The module layer implements application-level behavior and coordinates user scenarios.

Examples of existing modules include:

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

A module may:

- Receive user-interface actions through explicit presentation contracts.
- Coordinate one or more domain operations.
- Apply application-level workflow rules.
- Manage application state and lifecycle.
- Convert domain results into presentation models.
- Call infrastructure through explicit application ports or adapters.
- Coordinate navigation and application-wide user flows.

A module must not:

- Become a second copy of the domain layer.
- Own or redefine domain business rules.
- Reach into another module's private implementation.
- Put visual styles or design tokens in JavaScript.
- Directly manipulate unrelated domain internals.

Keep domain logic in the domain that owns it. Keep cross-domain orchestration in an explicitly identified application-level workflow rather than hiding it inside one domain.

### 5.3 Design system — presentation and visual language

Location: `source/design-sistem/`

All visual implementation belongs to this directory.

It includes:

- Design tokens and semantic color tokens.
- Typography and spacing definitions.
- Themes.
- CSS.
- Reusable visual components.
- Visual states and transitions.
- Responsive behavior.
- Presentation primitives shared by application surfaces.

Mandatory rules:

- All CSS must live under `source/design-sistem/`.
- Do not use inline `<style>` blocks.
- Do not use HTML `style` attributes.
- Do not use `element.style` or assign CSS from JavaScript.
- Do not embed CSS strings in JavaScript.
- Colors must be expressed through semantic design tokens rather than scattered hard-coded values.
- Components must not contain domain business rules.
- The design system must not import domain implementations or call domain services directly.
- JavaScript behavior in a visual component must be limited to presentation behavior and explicit UI events.

The design system must support three presentation environments from the beginning:

1. Desktop web.
2. Mobile web.
3. Telegram Mini App.

These environments should share one visual language and reusable presentation components. Use responsive layouts and small, explicit environment adapters where platform differences require them. Do not fork business logic for each environment.

Both light and dark themes must be treated as first-class themes.

### 5.4 Core — shared technical contracts and mechanisms

Location: `source/core/`

Core contains only mechanisms and contracts that are genuinely shared across multiple parts of the application.

It must not become a miscellaneous folder or a second home for domain logic.

Current core directories and their intended responsibilities:

#### `application-contracts/`

Neutral application-level technical protocols shared by multiple independent application areas.

A contract required by one specific workflow belongs to that workflow's application boundary. Move a protocol here only when multiple independent consumers genuinely share the same provider-neutral requirement.

Do not place business rules, domain entity definitions, or provider-specific types here.

#### `domain-contracts/`

Only domain-neutral primitives genuinely shared by multiple Domains.

Domain-specific entity contracts, repository interfaces, and business types remain with the Domain that owns them. This directory may remain empty if no real shared primitive exists.

Do not invent universal entities or repositories to populate it.

#### `event-system/`

Shared technical event dispatching and subscription mechanism.

It may provide explicit publish/subscribe primitives, but it must not:

- Become a hidden dependency injection mechanism.
- Hide direct function calls that should be explicit.
- Own domain business decisions.
- Replace domain-specific event definitions.
- Turn every function call into an event.

Use events when decoupled notification is valuable. Prefer direct, explicit calls for ordinary request/response operations.

#### `presentation-contracts/`

Minimal, presentation-neutral protocols required by multiple Design System and Module boundaries.

Feature-specific view models normally belong to the Module that assembles the data. Visual components and local presentation behavior belong to Design System.

Do not expose domain internals, duplicate domain entities, or create a universal UI schema.

#### `dependency-management/`

Small, reusable technical utilities for explicit dependency construction, only when repeated composition needs justify them.

The application composition root belongs to the actual application bootstrap boundary, not automatically to Core. Core may provide a lightweight helper, but it must not select business workflows or act as a global service locator.

For this vanilla JavaScript project, prefer clear, manual dependency construction and passing dependencies into modules. Do not introduce a complex dependency injection container, runtime scanning, or implicit global service locator.

See `docs/architecture/core-structure.md` for the detailed responsibility and boundaries of each Core directory.

## 6. Dependency direction and communication

The default direction of application interaction is:

`User → Design System → Module → Domain`

Results return through the application layer:

`Domain → Module → Design System → User`

The design system emits explicit UI events. Modules interpret those events and coordinate application behavior. Domains execute business operations and return results.

Mandatory dependency constraints:

- `domain` must not import `module`.
- `domain` must not import `design-sistem`.
- `design-sistem` must not import `domain`.
- `design-sistem` must not call domain services.
- A module must not depend on another module's private files.
- Cross-layer communication must use explicit public interfaces or contracts.
- Shared core mechanisms must be imported deliberately; do not create implicit global coupling.
- Avoid circular dependencies.

A dependency is not justified merely because two parts of the application need similar data. First identify who owns that data and which layer owns the operation.

### 6.1 Cross-domain behavior

When a user scenario involves multiple domains, do not place another domain's rules inside the first domain.

Use an application-level workflow in the module layer to coordinate the relevant domain interfaces. If a genuinely reusable cross-domain capability emerges, define its ownership and contract explicitly before creating a shared abstraction.

Relationships between users, projects, and tools must not be duplicated independently inside each domain. Their ownership and storage model must be explicitly designed before implementation.

## 7. Application surfaces

Raymondovich must support:

- Desktop web.
- Mobile web.
- Telegram Mini App.

Rules:

- Business rules and domain operations remain shared.
- Application workflows should remain shared wherever behavior is equivalent.
- Presentation may adapt to screen size and host environment.
- Platform-specific behavior belongs in explicit adapters or integration boundaries.
- Do not detect an environment throughout the codebase with scattered conditional checks.
- Keep Telegram-specific APIs outside domain logic.
- A platform adapter must not become the owner of business data.

## 8. Backend and external integrations

External services must be accessed through explicit integration boundaries.

The project may use services such as Supabase, Cloudflare, GitHub, and Resend. Their SDKs, APIs, credentials, and transport details must not leak into domain business rules.

Rules:

- Keep credentials and secrets out of source code and Git.
- Never expose privileged service keys or server-only credentials to browser code.
- Validate and authorize sensitive operations on a trusted server-side boundary.
- Treat client-side checks as user-experience controls, not security controls.
- Enforce data access restrictions at the backend and database layer.
- Do not assume that hiding a UI control protects the underlying operation.
- Handle external service failures explicitly.
- Do not log passwords, authentication tokens, PINs, private keys, or other secrets.
- Do not add or modify database schema, RLS policies, authentication flows, routes, or deployed functions during a visual-only task.
- Any backend or schema change must identify its impact on existing data, access policies, and clients before execution.

Do not introduce a new external service or dependency without explaining why the existing architecture cannot meet the requirement.

## 9. Authentication, authorization, and sensitive operations

Authentication establishes who the user is. Authorization determines what that user is allowed to do. These concerns must remain distinct.

- Never treat a client-provided role, user ID, project ID, or permission flag as proof of authorization.
- Verify access on the trusted backend for every sensitive operation.
- Apply least-privilege access.
- Deny access by default when permission cannot be established.
- Do not trust data merely because it came from an authenticated client.
- Keep owner, administrator, manager, and ordinary-user capabilities explicit.
- Changes to roles, permissions, PIN handling, or account recovery require careful security review.
- Never store plaintext passwords or authentication secrets.
- Do not weaken existing RLS or backend authorization to make a frontend flow work.

## 10. Routing, state, and browser behavior

- Keep route definitions centralized in the routing responsibility.
- Do not create competing route registries in unrelated modules.
- Keep application state ownership explicit.
- Avoid duplicating the same state in multiple modules without a synchronization strategy.
- Do not use the URL as an undocumented global state store.
- Validate external input, URL parameters, and persisted client data before use.
- Handle loading, empty, success, and error states explicitly.
- Ensure forms remain usable on mobile and do not cause unintended browser zoom.
- Preserve browser navigation behavior, including back/forward navigation, where applicable.

## 11. Accessibility and responsive quality

Every user-facing feature must be usable across the supported presentation environments.

- Use semantic HTML.
- Ensure controls have accessible names.
- Support keyboard navigation on desktop.
- Provide visible focus states.
- Do not communicate status using color alone.
- Respect reduced-motion preferences.
- Keep touch targets usable on mobile.
- Prevent horizontal overflow at supported viewport sizes.
- Check both light and dark themes.
- Check Telegram Mini App layout constraints and safe areas where applicable.

## 12. Testing and verification

Testing must match the risk and scope of the change.

At minimum, before reporting completion:

1. Inspect the changed files and their imports.
2. Check that dependency direction has not been violated.
3. Check naming and version metadata.
4. Check that no forbidden inline or JavaScript-generated CSS was introduced.
5. Verify relevant behavior in the available runtime or browser when possible.
6. Verify responsive behavior for affected presentation components.
7. Verify both themes when visual styles change.
8. Check error and empty states for affected workflows.
9. Report any checks that could not be performed.

Do not claim that tests passed if no tests were run. If the repository has no test harness for a behavior, state what manual or static verification was performed.

Security-sensitive changes require an explicit review of authorization, data exposure, and failure behavior.

## 13. Change management

Before changing a file:

- Read the current version.
- Understand its callers and dependencies.
- Identify whether the change affects a public contract.
- Identify any related files that must change together.

When changing an interface:

- Search for all known consumers.
- Update consumers deliberately.
- Avoid leaving old and new contracts active without a migration plan.
- Document breaking changes.

When creating a new directory or architectural abstraction:

- State the responsibility it owns.
- State what must not be placed there.
- Identify its dependencies.
- Confirm that the responsibility is not already owned by an existing directory.

Do not perform broad cleanup or unrelated refactoring as part of a narrowly scoped task.

## 14. Git and repository operations

- Work in the intended repository and branch.
- Inspect the current state before writing.
- Do not overwrite a file without retrieving its current content and SHA.
- Use clear, scoped commit messages.
- Keep commits focused on one coherent change.
- Do not commit secrets, credentials, temporary dumps, or unrelated generated files.
- After a write, verify the resulting file or commit when the available tools allow it.
- Never state that a deployment occurred merely because a Git commit succeeded.

## 15. Skill selection and activation

The repository's agent Skills provide task-specific operating instructions. The main Agent Rules remain mandatory for every task; a Skill supplements these rules and does not override them.

Before implementation, identify the primary responsibility of the task and read the corresponding Skill in full.

### Available Skills

- `docs/agent-skill/core-architect.md` — architecture boundaries, shared contracts, dependency direction, and structural decisions.
- `docs/agent-skill/domain-developer.md` — domain entities, business rules, domain operations, and public domain interfaces.
- `docs/agent-skill/module-developer.md` — application workflows, orchestration, application state, and presentation coordination.
- `docs/agent-skill/infrastructure-developer.md` — external providers, infrastructure adapters, transport, and technical integrations.
- `docs/agent-skill/web-designer.md` — UX/UI design, information architecture, visual language, design-system components, responsive layouts, themes, accessibility, and visual verification.

### When to use Web Designer

Web Designer must be activated whenever a task primarily involves:

- Designing or redesigning a website page, application screen, or user journey.
- Defining or changing layout, visual hierarchy, typography, spacing, colors, themes, or responsive behavior.
- Creating, extending, or reviewing reusable UI components.
- Designing interactions, transitions, animation, or visual states.
- Evaluating accessibility, usability, and rendered visual quality.

For tasks that combine visual implementation with application behavior, use Web Designer together with Module Developer. For tasks involving domain-owned meaning or business rules, also use Domain Developer. For shared architectural changes, involve Core Architect.

A Skill is not required merely because a task displays data. Select Skills according to the responsibility being changed, not the names of files or screens.

### Skill precedence

1. Repository-wide Agent Rules are mandatory for all work.
2. Architecture documents define approved structural boundaries and decisions.
3. The relevant Skill defines task-specific responsibilities and procedures.
4. A task instruction may narrow scope but must not silently override higher-level rules.

If Skills appear to conflict or ownership is unclear, stop and request an architecture decision rather than combining responsibilities implicitly.

## 16. Agent execution protocol

Every development agent must follow this sequence:

### Before implementation

1. Read this document.
2. Inspect the relevant repository paths and current files.
3. Identify the target layer and its responsibility.
4. Identify dependencies, public contracts, and affected consumers.
5. Check for security, data, and compatibility implications.
6. Summarize the intended change if it is architectural, cross-layer, destructive, or security-sensitive.

### During implementation

1. Work only within the approved scope.
2. Follow naming, versioning, and dependency rules.
3. Keep business logic, application orchestration, and presentation separate.
4. Avoid unnecessary abstractions and duplicated code.
5. Preserve existing behavior outside the task scope.

### After implementation

1. Review the diff or resulting files.
2. Perform the available checks.
3. Report created, modified, and deleted paths.
4. Report verification performed and its result.
5. Identify limitations, unresolved decisions, and follow-up work.
6. Do not claim unperformed work.

## 17. Architecture decision rule

When a requirement does not clearly belong to an existing layer, do not place it in the most convenient folder by default.

Determine:

1. Is it a business rule or business capability? It belongs to the owning domain.
2. Is it an application workflow or coordination between capabilities? It belongs to a module.
3. Is it visual presentation, styling, or a reusable UI primitive? It belongs to the design system.
4. Is it a genuinely shared technical protocol or mechanism? It may belong to core.
5. Is it platform-specific communication with an external service? It belongs behind an explicit integration adapter.

If ownership remains ambiguous, document the alternatives and request an architecture decision before implementation.

---

**End of document.**
