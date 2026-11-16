# Project Domain

**Version:** 1.0.0  
**Updated:** 2026-11-16  
**Status:** Initial ownership boundary

## Responsibility

This directory is the authoritative frontend domain boundary for project concepts and business rules.

The Project domain owns:
- Project identity and lifecycle semantics.
- Project-specific invariants and validation when they are represented in the client domain.
- Project-owned repository and capability contracts.
- Stable project-facing types and domain operations.

It does not own:
- Screen rendering or CSS.
- Workspace navigation and user interaction workflows.
- Supabase transport, authentication sessions, or provider response handling.
- Cross-domain application orchestration.

## Current implementation boundary

The current project invariants and authorization checks are enforced by PostgreSQL functions and database security policies in the Supabase backend. The frontend currently consumes the existing RPC contract; it must not duplicate backend authorization rules or infer permissions from presentation state.

The Supabase RPC transport has been separated from the authentication client into:

- `source/infrastructure/supabase/project-api.js`

The application workflow remains in:

- `source/module/workspace/workspace.js`

The presentation remains in:

- `source/design-sistem/workspace-view.js`
- `source/design-sistem/workspace.css`

No client-side domain rules are invented in this initial boundary change. Add domain entities, value objects, validation, or repository ports only when their semantics are explicitly defined and can be tested independently without changing the existing RPC contract.

## Dependency rule

Project Domain must not import Module, Design System, Infrastructure, browser APIs, or Supabase. Infrastructure implements the technical access required by application workflows; it does not become the owner of Project business meaning.
