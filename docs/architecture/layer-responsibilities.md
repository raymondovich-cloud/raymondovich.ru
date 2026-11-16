# Layer Responsibilities

**Version:** 1.0.1  
**Updated:** 2026-11-16  
**Status:** Active

## 1. Purpose

This document defines the responsibility boundaries of the five primary architectural layers in Raymondovich:

- Domain
- Module
- Design System
- Core
- Infrastructure

Its purpose is to prevent business logic, application orchestration, presentation, shared technical mechanisms, and provider-specific code from being mixed together.

This document complements `docs/architecture/architecture-overview.md`. It defines ownership boundaries; it does not prescribe a complete internal folder structure for every layer.

## 2. General responsibility rule

Every implementation unit must have one explicit primary responsibility.

Before placing code or a contract, answer:

1. What responsibility does this implementation fulfill?
2. Which layer owns that responsibility?
3. Which data or contract does it own?
4. Which dependencies may it use?
5. Which dependencies must it never use?

Choose the owner based on responsibility, not on which directory is easiest to access.

Do not duplicate the same business rule or authoritative data across layers.

## 3. Domain

**Location:** `source/domain/`  
**Primary responsibility:** business meaning and business rules.

### 3.1 Domain owns

- Business entities and value objects.
- Business invariants and lifecycle rules.
- Business validation.
- Domain-specific operations.
- Domain-specific repository and service ports where required.
- Domain events representing facts that have occurred.
- The authoritative meaning and ownership of domain data.

A domain must be able to express its business rules without knowing how the application displays them or which provider stores its data.

### 3.2 Domain may

- Define interfaces required to persist or retrieve its own data.
- Accept explicit dependencies through its public operations.
- Publish or return domain events through an agreed contract.
- Expose stable public operations to application modules.
- Validate business conditions independently of UI input validation.

### 3.3 Domain must not

- Render UI or manipulate the DOM.
- Import Design System components or CSS.
- Depend on Module implementations.
- Coordinate application navigation or screen transitions.
- Read browser storage or Telegram APIs directly.
- Import provider SDKs or call external provider APIs directly.
- Store provider credentials or transport configuration.
- Own another domain's entities or lifecycle.
- Contain generic helpers unrelated to its business capability.

### 3.4 Domain boundary

A domain exposes only the operations and types that other layers need.

Other domains and modules must not import private files or rely on undocumented internal data structures. Cross-domain behavior must not be implemented by reaching into another domain's internals.

A domain-specific repository contract normally belongs to the domain that owns the data. Its implementation belongs to Infrastructure.

## 4. Module

**Location:** `source/module/`  
**Primary responsibility:** application workflows and orchestration.

### 4.1 Module owns

- User-facing application scenarios.
- Coordination of one or more domain operations.
- Cross-domain workflows.
- Application state and workflow state.
- Application lifecycle and coordination.
- Mapping domain results into presentation models.
- Handling UI events through explicit presentation contracts.
- Application-level navigation and routing behavior where assigned.
- Application-level error translation and workflow outcomes.

### 4.2 Module may

- Call public operations from multiple domains.
- Call Infrastructure through explicit ports or application contracts.
- Validate input shape and format before invoking domain operations.
- Coordinate loading, success, failure, and retry states.
- Compose presentation data from multiple domain-owned sources.
- Dispatch application events where decoupled notification is useful.

### 4.3 Module must not

- Redefine or duplicate domain business rules.
- Become an alternative owner of domain entities or authoritative records.
- Import private implementation files from another module.
- Render visual components or define CSS.
- Store design tokens or presentation styles.
- Embed provider SDK calls and transport-specific behavior in workflows.
- Treat client-side state or UI visibility as proof of authorization.
- Hide cross-domain business ownership ambiguities inside orchestration code.

### 4.4 Cross-domain orchestration

If a scenario involves multiple domains, the Module layer coordinates the sequence through their public contracts.

Example: a workflow that creates a project from an idea must coordinate the Ideas and Project domains. It must not make the Ideas domain the owner of Project entities or copy Project business rules into Ideas.

The module coordinates the workflow; each domain remains responsible for its own invariants.

## 5. Design System

**Location:** `source/design-sistem/`  
**Primary responsibility:** visual presentation and reusable UI behavior.

### 5.1 Design System owns

- Design tokens and semantic color tokens.
- Typography, spacing, sizing, and visual scales.
- Light and dark themes.
- CSS and responsive layout rules.
- Reusable visual components and presentation primitives.
- Visual states, transitions, and animation.
- Accessible presentation behavior.
- Emission of explicit UI events.
- Presentation adaptation for Desktop Web, Mobile Web, and Telegram Mini App.

### 5.2 Design System may

- Receive presentation models from Modules.
- Render loading, empty, success, and error states.
- Emit user intent as typed or otherwise explicit UI events.
- Maintain temporary presentation-only state, such as an expanded menu or active visual tab.
- Adapt layout to viewport size, safe areas, and host environment.
- Use browser APIs strictly for presentation behavior when appropriate.

### 5.3 Design System must not

- Execute business operations or enforce business invariants.
- Import Domain implementations.
- Call repositories or provider APIs.
- Decide whether a user is authorized to perform a sensitive action.
- Persist authoritative business records.
- Coordinate multi-domain workflows.
- Contain business-specific permission rules.
- Put CSS in JavaScript or use inline styles.

All CSS, themes, tokens, and visual styling must follow the rules in `docs/agent.md` and remain under `source/design-sistem/`.

### 5.4 UI event boundary

A UI component reports user intent; it does not decide the business outcome.

For example, a component may emit `project-create-requested` with form input. A Module validates the application workflow, invokes the relevant Domain operation, and returns a presentation result.

The event name is illustrative, not a pre-approved event contract.

## 6. Core

**Location:** `source/core/`  
**Primary responsibility:** shared technical contracts and mechanisms.

### 6.1 Core owns

Only technical capabilities that are genuinely required by multiple parts of the application and have no more appropriate owner.

Current directories:

- `application-contracts/`
- `domain-contracts/`
- `event-system/`
- `presentation-contracts/`
- `dependency-management/`

### 6.2 Core may

- Define neutral shared protocols.
- Provide a small event dispatching mechanism.
- Provide shared presentation contract primitives.
- Provide small, reusable dependency-construction utilities when justified. The application composition root belongs to the actual application bootstrap boundary, not automatically to Core.
- Provide technical abstractions where reuse and stable ownership are demonstrated.

### 6.3 Core must not

- Own business entities or business policies.
- Become a dumping ground for shared-looking code.
- Duplicate domain-specific contracts.
- Contain application workflows.
- Contain UI components or CSS.
- Contain provider SDK adapters.
- Introduce hidden global state or implicit service lookup.
- Add abstractions solely to avoid explicit dependencies.

### 6.4 Contract ownership

A contract belongs to the narrowest layer that owns the responsibility:

- Domain-specific business and repository contracts belong to the owning Domain.
- Application workflow ports belong to the application boundary that uses them.
- Provider-neutral technical protocols may belong to Core if they are genuinely shared.
- Provider-specific implementations belong to Infrastructure.
- Presentation-facing UI contracts belong to the presentation/application boundary as established by the project.

Do not move a contract into Core merely because several files import it.

## 7. Infrastructure

**Location:** `source/infrastructure/`  
**Primary responsibility:** implementation of technical adapters to external systems and resources.

### 7.1 Infrastructure owns

- Provider-specific API clients and SDK usage.
- Database and persistence adapters.
- External service adapters.
- Translation between internal contracts and provider protocols.
- Transport configuration.
- Provider-specific error mapping.
- Technical retry, timeout, and idempotency mechanisms where appropriate.
- Trusted server-side integration logic and secret access.

### 7.2 Infrastructure may

- Implement Domain repository ports.
- Implement application-level service ports.
- Communicate with Supabase, GitHub, Cloudflare, Resend, Telegram, and other approved providers.
- Convert external payloads into internal representations.
- Apply technical resilience mechanisms.
- Expose adapters through explicit composition and dependency wiring.

### 7.3 Infrastructure must not

- Own business rules or domain lifecycle decisions.
- Decide application workflow order.
- Render UI or manipulate presentation state.
- Make a provider's data model the application's domain model by default.
- Expose privileged credentials to browser code.
- Bypass domain contracts to mutate business data without an explicit architecture decision.
- Become a general-purpose service locator.

### 7.4 Trusted execution boundary

Provider credentials and privileged operations must remain on trusted server-side boundaries. Browser code may use only credentials and APIs explicitly designed for public client use, with backend authorization enforced independently.

## 8. Responsibility comparison

| Concern | Owner |
| --- | --- |
| Business entity and invariant | Domain |
| Business validation | Domain |
| Application workflow | Module |
| Cross-domain coordination | Module |
| Application state | Module |
| UI event emission | Design System |
| Presentation model mapping | Module |
| Visual components and CSS | Design System |
| Design tokens and themes | Design System |
| Shared technical event dispatcher | Core |
| Genuinely shared technical protocol | Core |
| Provider API and SDK adapter | Infrastructure |
| Persistence adapter | Infrastructure |
| Provider credentials | Trusted Infrastructure boundary |
| Authorization enforcement | Trusted backend and data boundary, not UI |

This table identifies primary responsibility. Some implementations require cooperation between layers, but cooperation does not transfer ownership.

## 9. Common boundary violations

The following patterns are prohibited unless a documented architecture decision explicitly establishes an exception:

1. A UI component directly calls a Domain service.
2. A Domain imports a Module to trigger a screen transition.
3. A Domain calls Supabase or another provider SDK directly.
4. A Module copies business validation instead of invoking the owning Domain.
5. A Module accesses another Module's private files.
6. Core becomes a location for every shared helper or entity.
7. Infrastructure decides business permissions or lifecycle rules.
8. A frontend role flag is treated as backend authorization.
9. Two domains independently store authoritative copies of the same business relationship.
10. A provider response object is passed through the entire application as if it were a stable domain contract.

When a boundary violation is found, identify the correct owner and propose a focused correction. Do not perform broad restructuring without approval.

## 10. Review checklist for new code

Before accepting a new file or implementation, verify:

- [ ] Its primary responsibility is explicit.
- [ ] It is located in the correct layer.
- [ ] Its data and contract ownership are clear.
- [ ] It depends only on permitted public contracts.
- [ ] It does not duplicate another layer's rules.
- [ ] It does not expose private implementation details.
- [ ] It respects trusted backend and security boundaries.
- [ ] It follows naming, versioning, and technology constraints in `docs/agent.md`.
- [ ] Any unresolved ownership or dependency decision is documented before implementation.

## 11. Related documentation

- `docs/agent.md` — mandatory development and repository rules.
- `docs/architecture/architecture-overview.md` — high-level system architecture.
- `docs/architecture/core-structure.md` — detailed responsibilities of Core directories.
- `docs/agent-skill/core-architect.md` — Core architecture specialist.
- `docs/agent-skill/domain-developer.md` — Domain implementation specialist.
- `docs/agent-skill/module-developer.md` — Module implementation specialist.
- `docs/agent-skill/infrastructure-developer.md` — Infrastructure implementation specialist.

---

**End of document.**
