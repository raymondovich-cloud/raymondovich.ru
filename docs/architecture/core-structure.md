# Core Structure

**Version:** 1.0.0  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose

This document defines the responsibility and boundaries of every current directory inside `source/core/`.

Core is a supporting technical layer. It is not a business layer, an application workflow layer, a UI layer, or an integration layer.

The existence of a directory does not mean it must contain code immediately. A directory may remain empty until a concrete, repeated, cross-boundary requirement justifies an implementation.

This document refines the Core section in:

- `docs/agent.md`;
- `docs/architecture/architecture-overview.md`;
- `docs/architecture/layer-responsibilities.md`;
- `docs/architecture/dependency-rules.md`.

## 2. Core responsibility

Core may own only technical contracts and mechanisms that:

1. are required by more than one architectural area;
2. have no narrower and more appropriate owner;
3. do not contain Raymondovich business meaning;
4. do not depend on provider-specific implementations;
5. can be described and tested independently.

Before adding anything to Core, establish why the owning Domain, Module, Design System, or Infrastructure boundary is insufficient.

**Do not put code in Core merely because it is used in several places.** Reuse alone does not transfer ownership.

## 3. Current structure

```text
source/
└── core/
    ├── application-contracts/
    ├── domain-contracts/
    ├── event-system/
    ├── presentation-contracts/
    └── dependency-management/
```

The directories above currently represent architectural boundaries, not a requirement to create files or abstractions in each one.

## 4. application-contracts/

**Primary responsibility:** neutral application-level technical protocols shared by multiple application areas.

This directory may contain:

- small provider-neutral protocols used by multiple Modules;
- shared technical request/result shapes where those shapes are not owned by one workflow;
- stable application-wide capability contracts that have multiple legitimate consumers.

It must not contain:

- a contract that belongs to one specific Module or workflow;
- domain entities, value objects, business rules, or domain repository contracts;
- concrete service implementations;
- provider SDK types or provider response objects;
- UI component props or feature-specific view models.

**Ownership rule:** if a contract exists because one workflow needs an external capability, keep it with that workflow's application boundary. Move it here only when multiple independent application areas demonstrably share the same provider-neutral protocol.

## 5. domain-contracts/

**Primary responsibility:** narrowly scoped, domain-neutral primitives that are genuinely shared by multiple Domains.

This directory may contain:

- neutral domain-level primitives whose meaning is identical across multiple Domains;
- shared base protocols only when independent Domains have a real common semantic requirement;
- domain-event envelope primitives, if they are truly independent of the event transport mechanism.

It must not contain:

- Project, Idea, Profile, Team, Tools, or other specific domain entities;
- domain-specific repository interfaces;
- domain-specific business services, policies, validation, or lifecycle rules;
- copies or aggregations of contracts owned by individual Domains;
- provider-specific persistence models.

**Critical distinction:** the name `domain-contracts` does not make this the default home for all Domain interfaces. A repository contract for Projects belongs to the Project domain. A contract for Ideas belongs to Ideas. This directory is reserved for shared, domain-neutral concepts.

If no real shared domain primitive exists, this directory should remain empty. Do not invent a base entity, universal repository, or generic domain interface to populate it.

## 6. event-system/

**Primary responsibility:** technical event dispatching and subscription mechanics.

This directory may contain, when justified:

- an explicit in-process event dispatcher;
- subscription and unsubscription mechanisms;
- narrowly scoped event handler registration primitives;
- technical safeguards against duplicate dispatch or uncontrolled handler execution.

It must not contain:

- definitions of business events owned by a Domain;
- application workflow decisions;
- a hidden command bus for ordinary request/response calls;
- dependency injection or service lookup;
- provider-specific message queues or webhook adapters;
- implicit global mutable state.

Event ownership remains with the layer that owns the fact:

- business facts are defined by the relevant Domain;
- application workflow notifications are defined by the relevant Module;
- Core provides only the generic mechanism that transports them in-process.

Use direct function calls when the caller needs an immediate result. Introduce event dispatching only when decoupled notification has a concrete benefit.

External queues, durable delivery, retries across process boundaries, and provider messaging integrations belong behind Infrastructure adapters, not in this in-process event mechanism.

## 7. presentation-contracts/

**Primary responsibility:** minimal, presentation-neutral protocols needed for communication between the Design System and application Modules.

This directory may contain:

- generic UI interaction event conventions;
- neutral presentation state primitives shared across multiple application surfaces;
- minimal contracts that prevent Design System components from depending on feature-specific Module internals.

It must not contain:

- visual components, CSS, themes, tokens, or styles;
- feature-specific view models that are meaningful only to one Module;
- domain entities or domain services;
- application workflow logic;
- browser or Telegram host implementations.

Feature-specific view models normally belong to the Module that assembles the data. Visual components and their local presentation behavior belong to Design System.

Keep this directory small. Do not create a universal UI schema or generic component framework. If a contract is used by only one component/module pair, it usually does not belong in Core.

## 8. dependency-management/

**Primary responsibility:** small, explicit technical utilities for constructing and passing dependencies, only where repeated composition needs justify them.

This directory may contain:

- lightweight dependency factory helpers;
- explicit registration or validation utilities that do not perform hidden lookup;
- small lifecycle helpers for dependencies, if the application has a demonstrated need.

It must not contain:

- a global service locator;
- a hidden or automatically scanning dependency injection container;
- a mutable global registry used by arbitrary modules;
- business services or workflow orchestration;
- provider initialization as an import side effect;
- the application's composition root by default.

**Composition root distinction:** the composition root is the application entry/bootstrap boundary where concrete adapters are assembled and passed to the relevant Modules. Its exact location must be selected from the actual application entry points. It belongs to the application bootstrap responsibility, not automatically to Core.

Core may supply a small reusable construction utility, but it must not decide which business workflows run or which provider adapter is selected for a particular feature.

For the current vanilla JavaScript ES module architecture, prefer explicit factories and constructor/function parameters. Do not build a dependency injection framework before there is a concrete need.

If no reusable dependency-management utility is required, leave this directory empty. The application can assemble dependencies manually.

## 9. Dependency boundaries

Core must remain independent of feature implementations.

Allowed:

- Domain, Module, Design System, or Infrastructure importing a stable Core contract or utility where justified;
- Infrastructure implementing a contract owned by another layer;
- application bootstrap importing concrete Infrastructure adapters and passing them into Modules.

Prohibited:

- Core importing Domain, Module, Design System, or Infrastructure implementations;
- Core importing provider SDKs;
- Core importing browser UI components;
- Core owning business entities or workflow decisions;
- Core exposing mutable global state as a shortcut for dependency sharing.

A Core contract must not force all consumers to depend on a large universal interface. Prefer small contracts with one clear purpose.

## 10. Criteria for adding a file

Before creating a file under Core, answer all of the following:

1. What exact technical responsibility does it own?
2. Which independent parts of the application need it?
3. Why is the responsibility not owned by a narrower layer?
4. Does it contain any business or provider-specific meaning?
5. What are its allowed imports?
6. Can it be tested without initializing the application or connecting to a provider?
7. Would the architecture be simpler if the code remained with its current consumer?

If these questions do not have clear answers, do not create the file yet.

## 11. Current implementation status

The five directories are structural placeholders. Their presence does not imply that dispatchers, containers, base contracts, or shared abstractions have already been implemented.

Implementation must proceed only when a concrete use case exists. Do not populate all folders speculatively.

The architecture may later remove or consolidate an unused directory if implementation experience demonstrates that the boundary is unnecessary. Such a structural change must follow the repository's architecture change-control rules.

## 12. Related documentation

- `docs/agent.md` — mandatory development rules.
- `docs/architecture/architecture-overview.md` — overall architecture.
- `docs/architecture/layer-responsibilities.md` — layer ownership.
- `docs/architecture/dependency-rules.md` — allowed dependency directions and composition rules.
- `docs/agent-skill/core-architect.md` — Core architecture role.

---

**End of document.**
