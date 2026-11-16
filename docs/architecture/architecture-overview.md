# Raymondovich Architecture Overview

**Version:** 1.0.0  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose

This document describes the high-level software architecture of Raymondovich. It establishes the system's main responsibility areas, their boundaries, and the principles used to evolve the architecture.

This is an overview, not a substitute for detailed layer contracts, domain specifications, integration designs, or security policies. Those must be documented separately when their implementation is defined.

## 2. Architectural goals

The architecture must support:

- A modular ecosystem that can grow without turning into a tightly coupled application.
- Clear ownership of business capabilities and data.
- Reuse of application behavior across Desktop Web, Mobile Web, and Telegram Mini App.
- Independent evolution of presentation, business logic, and external integrations.
- Explicit contracts and predictable dependency direction.
- Testability, security, maintainability, and incremental delivery.
- The project's lightweight runtime constraints: vanilla JavaScript and native ES modules, without a framework or bundler unless explicitly approved.

## 3. High-level architecture

The primary application responsibility areas are:

1. **Design System** — presentation, visual components, styles, themes, and UI events.
2. **Module** — application workflows, orchestration, application state, and presentation-facing coordination.
3. **Domain** — business capabilities, business rules, entities, and domain operations.
4. **Core** — genuinely shared technical contracts and mechanisms.
5. **Infrastructure** — adapters that connect application contracts to external providers and technical resources.

The conceptual user interaction flow is:

`User → Design System → Module → Domain`

The result returns through the application boundary:

`Domain → Module → Design System → User`

Infrastructure supports the relevant application or domain boundary through explicit ports and adapters:

`Application/Domain Contract ← Infrastructure Adapter → External Provider`

This is a responsibility model, not a requirement that every request must pass through every layer. A feature should use only the layers it actually needs.

## 4. Layer responsibilities

### 4.1 Domain

**Location:** `source/domain/`

Domain represents the business capabilities of the ecosystem.

It owns:
- Business entities and value objects.
- Business invariants and rules.
- Domain-specific operations and validation.
- Domain events that describe business facts.
- Domain-specific contracts, including repository ports where appropriate.

It does not own:
- UI rendering, CSS, DOM behavior, or navigation.
- Application-wide workflow orchestration.
- Provider SDKs, transport details, or credentials.
- Another domain's authoritative data.

A domain exposes explicit public contracts. Other domains must not reach into its private implementation.

### 4.2 Module

**Location:** `source/module/`

Module represents application behavior and coordinates user-facing scenarios.

It owns:
- Application workflows and cross-domain orchestration.
- Application state and lifecycle.
- Coordination of domain operations.
- Presentation models and mapping of results for the UI.
- Navigation and routing behavior where assigned to the relevant module.
- Calls through explicit infrastructure/application ports.

It does not own:
- A second copy of domain entities or business rules.
- Provider-specific implementation details.
- Visual styling or design tokens.
- Private implementation details of other modules.

Cross-domain workflows belong here unless a deliberate architecture decision establishes another owner.

### 4.3 Design System

**Location:** `source/design-sistem/`

Design System owns the visual language and reusable presentation capabilities.

It owns:
- Design tokens and semantic color tokens.
- Themes, typography, spacing, and visual states.
- CSS and reusable visual components.
- Responsive presentation and transitions.
- Emission of explicit UI events.

It does not own:
- Business rules or domain operations.
- Authorization decisions.
- Persistence or provider integration logic.
- Direct dependencies on domain implementations.

All CSS must remain inside this directory, following the mandatory rules in `docs/agent.md`.

### 4.4 Core

**Location:** `source/core/`

Core contains only technical contracts and mechanisms that are genuinely shared across multiple parts of the application.

Current responsibility areas:

- `application-contracts/` — shared application-level ports and protocols.
- `domain-contracts/` — domain-neutral contracts that must be shared across boundaries.
- `event-system/` — technical event dispatching and subscription primitives.
- `presentation-contracts/` — neutral presentation-facing contracts.
- `dependency-management/` — explicit dependency construction and application composition.

Core must not become a miscellaneous utility folder, a global service locator, or a home for business rules. A contract should remain with its owning domain or module when it is not genuinely shared.

### 4.5 Infrastructure

**Location:** `source/infrastructure/`

Infrastructure implements technical adapters for external providers and resources.

Potential integrations include Supabase, GitHub, Cloudflare, Resend, Telegram, and other approved services.

It owns:
- Provider-specific API and SDK usage.
- Persistence and transport adapters.
- External service authentication at trusted boundaries.
- Translation between provider protocols and internal contracts.
- Technical concerns such as retries, idempotency, and provider error mapping where applicable.

It does not own:
- Business meaning or domain invariants.
- Application workflow decisions.
- UI behavior.
- Unrestricted access to secrets from browser code.

Infrastructure implements contracts; it must not force provider-specific concepts into domain models.

## 5. Dependency principles

The following rules are mandatory:

- Domain must not import Module or Design System.
- Domain must not depend on browser presentation APIs or provider SDKs.
- Design System must not import Domain or call domain services directly.
- Module must use public domain contracts and must not access another module's private files.
- Infrastructure must implement explicit contracts rather than become a dependency of domain business rules.
- Core may be used only for genuinely shared contracts and mechanisms.
- Avoid circular dependencies.
- Prefer direct function calls for ordinary request/response operations.
- Use events for decoupled notification when that provides a real benefit; do not turn every function call into an event.
- Construct dependencies explicitly. Do not introduce hidden global state or an elaborate dependency injection container without approval.

The exact owner of each contract must be decided by its responsibility:
- Domain-specific repository ports normally belong to the owning domain.
- Shared technical protocols may belong to Core.
- Application workflow ports may belong to the application boundary.
- Provider implementations belong to Infrastructure.

## 6. Domains and ownership

The currently established business domains include:

- `profile`
- `ideas`
- `team`
- `project`
- `tools`
- `ecosystem-algorithms`

Each domain is the authoritative owner of its own business concepts and lifecycle.

Cross-domain relationships must have an explicitly designated owner. Do not duplicate authoritative records in multiple domains. In particular, subscriptions, entitlements, permissions, memberships, and project assignments are distinct concepts and must not be treated as interchangeable.

A profile may present information from other domains, but presentation or read-only projection does not transfer ownership.

## 7. Application surfaces

The ecosystem is intended to support:

- Desktop Web.
- Mobile Web.
- Telegram Mini App.

Business rules and domain behavior remain shared across these surfaces. Application workflows should also remain shared when behavior is equivalent.

Presentation may adapt to viewport and host environment. Platform-specific behavior must be isolated behind explicit adapters or presentation boundaries rather than scattered environment checks.

No application surface may be treated as a trusted authorization boundary. Sensitive access must be enforced by a trusted backend and database policies as appropriate.

## 8. External systems and trust boundaries

External systems are reached through Infrastructure adapters and explicit contracts.

The browser, Telegram client, and other client environments are untrusted. Client-provided roles, user identifiers, permissions, and state must never be accepted as proof of authorization.

Secrets and privileged credentials must remain on trusted server-side boundaries. External callbacks and webhooks must be authenticated and validated before processing.

The exact authentication, authorization, data protection, and integration-security requirements must be specified in dedicated security documentation before production-sensitive implementation.

## 9. Repository structure and unresolved boundaries

The intended primary layer directories are:

```text
source/
├── core/
├── design-sistem/
├── domain/
├── infrastructure/
└── module/
```

The repository currently also contains top-level directories such as `source/admin-system/` and `source/search/`. Their precise architectural ownership and relationship to the primary layers are not fully established by this overview.

Do not automatically treat these directories as additional architectural layers or move their contents. Their responsibilities must be inspected and resolved through a separate architecture decision before implementation depends on them.

## 10. Architecture change control

Before introducing a new layer, shared abstraction, cross-domain capability, or dependency:

1. Identify the responsibility it will own.
2. Identify the existing owner, if any.
3. Define its public contract and dependency direction.
4. Identify affected domains, modules, infrastructure adapters, and application surfaces.
5. Evaluate security, data ownership, and migration implications.
6. Record the decision when it changes or extends the architecture.

If ownership or dependency direction is unclear, stop and document the alternatives. Do not choose a location merely because it is convenient.

## 11. Related documentation

- `docs/agent.md` — mandatory development and repository rules.
- `docs/agent-skill/core-architect.md` — Core architecture responsibilities.
- `docs/agent-skill/domain-developer.md` — Domain implementation responsibilities.
- `docs/agent-skill/module-developer.md` — Module implementation responsibilities.
- `docs/agent-skill/infrastructure-developer.md` — Infrastructure implementation responsibilities.

Detailed architecture documents will extend this overview without duplicating it.

---

**End of document.**
