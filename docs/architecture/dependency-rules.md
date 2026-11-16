# Dependency Rules

**Version:** 1.0.0  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose

This document defines enforceable dependency rules for the Raymondovich source architecture.

It supplements:

- `docs/agent.md` — repository-wide development rules;
- `docs/architecture/architecture-overview.md` — architecture layers and system structure;
- `docs/architecture/layer-responsibilities.md` — ownership and responsibility boundaries;
- the role instructions in `docs/agent-skill/`.

The purpose is to keep dependencies explicit, directional, testable, and independent of the user interface or external providers.

## 2. Dependency direction

The architecture has five logical layers:

- **Design System** — user interface and visual presentation;
- **Module** — application workflows and coordination;
- **Domain** — business concepts, rules, and operations;
- **Core** — genuinely shared technical contracts and mechanisms;
- **Infrastructure** — implementations that communicate with external systems.

The normal user interaction flow is:

```text
User
  -> Design System
  -> Module
  -> Domain
  -> Module
  -> Design System
  -> User
```

Infrastructure is connected through explicit contracts:

```text
Contract owner
  <- implemented by -
Infrastructure adapter
  -> external provider
```

The arrows in the interaction flow describe runtime interaction, not permission for arbitrary imports. Import dependencies must follow the rules below.

## 3. Allowed dependency rules

### 3.1 Design System

Design System may:

- import its own components, tokens, styles, and presentation utilities;
- communicate user intent to Module through an explicit interface supplied by the application;
- render presentation data supplied by Module.

Design System must not:

- import Domain entities, repositories, or domain services;
- import Infrastructure adapters or provider SDKs;
- contain business rules or make authorization decisions;
- access application data stores directly;
- import private implementation details from Module.

The UI must not become a second application layer.

### 3.2 Module

Module may:

- import and coordinate public contracts exposed by Domain;
- import presentation contracts and shared application contracts where appropriate;
- coordinate workflows spanning multiple domains;
- receive Infrastructure-backed dependencies through explicit construction or injection;
- transform domain/application results into presentation models.

Module must not:

- import private files or internal implementation details of another Module;
- import provider SDKs or concrete Infrastructure adapters into workflow logic;
- duplicate business invariants owned by Domain;
- make a domain authoritative record by copying it into another domain;
- depend on Design System implementation details.

A Module can coordinate a workflow involving several domains, but each domain retains ownership of its own entities and business rules.

### 3.3 Domain

Domain may:

- import its own internal modules;
- import narrowly scoped shared contracts when a genuine shared dependency exists;
- define domain-owned ports, repository contracts, and domain events;
- depend on stable language/runtime primitives that do not introduce infrastructure coupling.

Domain must not:

- import Module or Design System;
- import Infrastructure implementations;
- import database clients, HTTP clients, provider SDKs, browser APIs, or Telegram-specific APIs;
- depend on another domain's private implementation;
- coordinate application navigation or user-interface state.

Cross-domain dependencies require an explicit design decision. Prefer application-level coordination in Module over direct domain-to-domain coupling. If a domain genuinely needs another domain's capability, expose a narrow public contract and document the ownership and dependency.

### 3.4 Core

Core may contain only mechanisms and contracts that are genuinely shared across the architecture, such as:

- application-level contracts;
- shared domain contract primitives where justified;
- event dispatching infrastructure or event-system primitives;
- presentation contract primitives;
- dependency construction/composition utilities.

Core must not:

- own Raymondovich business entities or domain-specific rules;
- become a general-purpose location for code that has no clear owner;
- import domain-specific implementations;
- import Design System;
- import provider SDKs merely to simplify access to them.

A contract should remain with the narrowest layer that owns its meaning. Do not move a contract to Core only because several files use it.

### 3.5 Infrastructure

Infrastructure may:

- import provider SDKs and external APIs;
- implement ports/contracts owned by Domain or application boundaries;
- perform persistence, network communication, webhook handling, and provider-specific mapping;
- translate external errors and data formats into stable internal results;
- depend on shared Core mechanisms where required.

Infrastructure must not:

- become the owner of business rules;
- expose provider-specific objects as domain contracts;
- make application workflow decisions;
- import Design System;
- bypass the contract it is intended to implement.

An adapter must implement an existing contract or be introduced together with a clearly owned contract. Do not create arbitrary adapters without a defined consumer and boundary.

## 4. Contract ownership and implementation

The contract belongs to the layer that owns the requirement:

| Contract purpose | Contract owner | Implementation |
| --- | --- | --- |
| Domain-specific repository or capability | Relevant Domain | Infrastructure |
| Application workflow's external service requirement | Relevant application boundary / Module | Infrastructure |
| Truly shared technical mechanism | Core | Appropriate technical implementation |
| UI rendering and interaction contract | Design System boundary | Design System |

Examples:

- A project repository contract belongs to the Project domain because Project owns the project data and its invariants.
- A provider adapter that stores or retrieves projects belongs to Infrastructure and implements the Project-owned contract.
- A workflow-level notification requirement may be expressed by the application boundary; an email provider adapter belongs to Infrastructure.
- A provider's raw response shape must not become the public contract consumed by Domain or Module.

Do not assume every contract belongs in Core. Core is not a default location for interfaces.

## 5. Public and private module boundaries

Every Domain and Module must distinguish between its public interface and private implementation.

**Public interface** is the supported entry point for other parts of the application. It may expose:

- operations/use-case entry points;
- input and output contracts;
- stable domain types;
- domain events intended for external consumers.

**Private implementation** includes internal helpers, persistence details, local state implementation, and workflow steps that are not part of the supported interface.

Rules:

1. Cross-boundary consumers use the public interface only.
2. A consumer must not reach into another Domain or Module's internal folders.
3. Renaming or restructuring private implementation must not require unrelated consumers to change.
4. Public contracts must be intentional and documented; do not export every internal file.
5. Do not create a public interface that exposes provider-specific types or mutable internal state.

The exact file names and export layout must follow the actual directory structure. Do not invent paths or create duplicate entry points before inspecting the repository.

## 6. Dependency construction and runtime composition

Concrete implementations must be connected at an explicit composition boundary.

Rules:

- Workflow code receives the dependencies it needs through constructor/factory parameters or another explicit injection mechanism.
- The composition boundary selects concrete Infrastructure adapters and passes them to the relevant application/domain-facing services.
- Domain logic must remain executable without initializing a provider SDK or network connection.
- Module workflow logic must be testable with substitute implementations of its dependencies.
- Dependencies must not be obtained through hidden global registries or implicit service lookup.

Do not use:

- a global mutable dependency container;
- a hidden service locator;
- imports that instantiate provider clients as a side effect;
- module-level singleton state as an implicit communication channel;
- circular initialization between modules.

A composition root is an assembly point, not a place for business logic. Its exact location must be decided from the real application entry points and documented before implementation. Do not assume that `source/core/dependency-management/` is automatically the composition root; that folder may provide shared construction utilities, but it must not silently become a global service locator.

## 7. Events and communication

Events are appropriate when a consumer needs to react to a fact without the producer knowing the consumer.

Use direct function calls for ordinary request/response operations where the caller needs an immediate result.

Event rules:

1. The layer that owns the fact defines the meaning and payload of its event.
2. Shared event-system code may provide dispatching and subscription mechanics; it must not own domain-specific business meaning.
3. Events represent facts that have occurred, not disguised commands to another module.
4. Event payloads must contain only the data required by consumers and must not expose mutable internal objects.
5. Consumers must not rely on undocumented event ordering.
6. Avoid using events for synchronous operations that require an immediate success/failure response.
7. Prevent event loops, duplicate side effects, and unbounded chains of handlers.
8. Where delivery can be retried or repeated, handlers must be designed for idempotency or use an explicit deduplication strategy.

Do not use a central event bus to hide dependencies that should be explicit. Event-driven communication is not a replacement for clear ownership and contracts.

## 8. Circular dependency prohibition

Circular dependencies are prohibited at both file and architectural levels.

Examples of prohibited cycles:

- Domain A imports Domain B while Domain B imports Domain A.
- Module A imports Module B while Module B imports Module A.
- A public contract imports its consumer's implementation.
- Infrastructure imports a workflow that imports the same Infrastructure adapter.
- Design System imports Module internals while Module imports Design System internals.

Resolve a cycle by:

1. identifying the actual ownership of the shared concept;
2. extracting a narrow contract to the correct owner, if justified;
3. moving cross-domain/application coordination to Module;
4. passing dependencies explicitly from the composition boundary.

Do not resolve cycles by moving unrelated code into Core or by adding a global registry.

## 9. Vanilla JavaScript ES module rules

The project uses native JavaScript ES modules and does not use a framework or bundler.

Therefore:

- use explicit ES module imports and exports;
- keep import paths valid for the actual runtime and hosting configuration;
- avoid relying on bundler aliases, automatic dependency injection, or build-time magic;
- avoid import-time side effects, especially network requests and provider initialization;
- do not introduce a package, framework, bundler, or new dependency without explicit approval;
- keep browser-specific APIs outside Domain;
- keep provider SDK imports inside Infrastructure integration boundaries.

Before adding an import, verify that the dependency direction is allowed and that the imported symbol is part of the target boundary's public interface.

## 10. Dependency review checklist

Before merging or committing a change, verify:

- [ ] Every dependency has a clear architectural reason.
- [ ] Imports follow the permitted layer directions.
- [ ] Domain has no dependency on Module, Design System, or Infrastructure.
- [ ] Design System has no dependency on Domain or Infrastructure.
- [ ] Module uses public contracts and does not import provider implementations into workflow logic.
- [ ] Infrastructure implements explicit contracts and does not own business rules.
- [ ] Core contains only genuinely shared mechanisms and contracts.
- [ ] No private implementation is imported across a boundary.
- [ ] No circular dependency exists.
- [ ] Dependencies are passed explicitly; no hidden service locator or global mutable container is used.
- [ ] Events are used for decoupled notifications, not as a substitute for direct calls or explicit contracts.
- [ ] No provider initialization or network request occurs as an import side effect.
- [ ] The change follows the repository's file naming, versioning, and design-system rules.

If a change cannot satisfy a rule, stop and document the architectural exception before implementation. Do not silently bypass the boundary.

## 11. Change control

Any change to dependency direction, contract ownership, public boundaries, or runtime composition is an architectural change.

Before implementing such a change:

1. describe the current dependency and the problem;
2. identify affected layers, domains, and modules;
3. explain why the existing boundary is insufficient;
4. propose the smallest change that preserves ownership;
5. update the relevant architecture documentation;
6. obtain approval where required by the project workflow.

An implementation convenience is not sufficient justification for weakening an architectural boundary.
