# Teams — Backend Architecture Specification

**Version:** 1.6.0  
**Status:** Core database and Team workspace integration implemented in development; B1 member-list migration applied and frontend confirmed; B2 invitations/notification-center migration applied as 20261124083432  
**Created:** 2026-11-24  
**Updated:** 2026-11-24  
**Target repository:** raymondovich-cloud/r.ru-Development  
**Supabase project:** yajybgdorhxebbigwjgi  
**Target schema:** teams

## 1. Purpose and boundaries

Teams is an independent ecosystem domain for user groups. A Team is not a Project and is not a Project-membership container. Teams may exist without Projects; Projects may be linked explicitly. Team membership never grants Project access. Projects remains the sole authority for Project permissions.

This document records the approved Team architecture and implementation state. Database migrations listed below have already been applied to the development Supabase project. Production deployment and any further database changes require separate approval.

### MVP scope
- Create Team.
- List Teams of the authenticated user.
- Retrieve authorized Team details.
- Owner membership and fixed roles.
- Server-side Team creation capability enforcement.
- Ecosystem-owner free creation exception.
- Append-only audit for core mutations.

### Deferred
Billing implementation, custom roles, Team chat/tasks/files, ownership transfer, deletion, and Project-link operations pending an approved Projects-domain validation contract. Invitations and membership administration are specified separately. B1 member-list migration is applied; B2 invitation/notification-center SQL is drafted but not applied.

## 2. Existing identity and integration facts

- Identity: Supabase Auth, auth.users.id (UUID).
- Profile data: private.user_profiles.
- Username is for display/input, not a relational key.
- Trusted owner flag currently: auth.users.raw_app_meta_data value raymondovich_role=owner. It must only be read server-side; never accept this value from a client.
- No shared subscription/entitlement system was found in the audited database.
- Projects is a separate domain/schema. Team membership must not be reused as Project membership.

All user references store UUIDs, never usernames or email addresses. FK behavior and schema grants must be verified during migration review.

## 3. Proposed data model

Use a non-exposed teams schema. Client operations go through narrowly scoped RPC wrappers; internal privileged functions remain in a non-exposed schema following current project conventions.

### 3.1 teams

| Column | Type | Rule |
| --- | --- | --- |
| id | uuid | Server-generated PK |
| name | text | Trimmed; 2–80 characters |
| description | text | Optional; max 500 characters |
| owner_user_id | uuid | Auth user UUID |
| status | text | active or archived; default active |
| created_at | timestamptz | Server timestamp |
| updated_at | timestamptz | Server-managed |

MVP allows duplicate Team names. No slug or global name uniqueness. Reject whitespace-only names. Restrict status values. Ownership must correspond to one active owner membership, maintained transactionally. No physical deletion in MVP.

### 3.2 memberships

| Column | Type | Rule |
| --- | --- | --- |
| id | uuid | Server-generated PK |
| team_id | uuid | FK Team |
| user_id | uuid | Auth UUID |
| role | text | owner/admin/manager/member |
| status | text | active/suspended |
| joined_at | timestamptz | Server timestamp |
| created_at | timestamptz | Server timestamp |
| updated_at | timestamptz | Server-managed |

Unique team_id + user_id. Allow-list constraints on role/status. Owner membership must be active. Exactly one owner in MVP. Owner role cannot be changed by ordinary membership RPCs. Actor comes from auth.uid(). Suspended memberships have no Team permissions.

### 3.3 invitations — B2 draft

Invitations target registered user UUIDs resolved from the verified canonical `private.user_profiles.username`. Recipient alone may accept/decline; statuses are pending/accepted/declined/cancelled/expired; one pending invitation per Team/user; expiry is seven days. Exact username resolution is private and permission-gated. No public user directory is created. See the Membership and Invitations specification and the B2 SQL draft.

### 3.4 team_projects — separate implementation phase

Explicit Team/Project association only. Proposed columns: id, team_id, project_id, linked_by_user_id, created_at. Unique Team/Project pair. Team permission controls link requests, while Projects independently validates actor authority. Association must not create or change Project membership, role, grant, visibility, or access. Unlinking must not revoke Project access.

Do not create this table until Projects domain has an approved validation contract; do not bypass domain ownership with direct table access.

### 3.5 Fixed role/permission model (MVP)

| Role | Team capabilities |
| --- | --- |
| owner | view, settings, members, projects, archive |
| admin | view, settings, members, projects |
| manager | view; limited project-link management (later) |
| member | view |

Roles and permissions may be server-side constants in MVP. Do not implement a mutable role-permissions table unless future requirements justify it. Team roles are Team-scoped and never imply Project permissions.

## 4. Create entitlement and free owner exception

Capability: team.create. Default: denied.

Resolver sources planned: trusted owner override, future subscription entitlement, explicit administrative grant. No Team-specific billing table should be introduced to duplicate a future shared entitlement model.

Owner may create Teams without subscription. Owner detection must use trusted server-side metadata or a server-maintained registry—not client flags, profile fields, username comparison, or UI state.

Owner override bypasses only the create-entitlement gate; it does not bypass input validation, audit, rate limiting, or invariant checks.

Until a shared entitlement system exists, implement a clearly isolated server-side resolver. It must be replaceable without changing the create RPC. Client UI may hide/disable creation, but server checks are authoritative.

When paid access expires: existing Teams, members, links, and history remain. Only creation of additional Teams is blocked. Billing/grace-period rules are a separate shared subscription design.

## 5. Server authorization

Every RPC must:
1. Require a valid authenticated session.
2. Derive actor UUID from auth.uid().
3. Validate all inputs.
4. Check Team membership, status, and permission.
5. Execute transactionally.
6. Audit mutations.
7. Return minimal necessary fields.

Do not accept actor UUID as an authorization input. Suspended members are denied. Non-members cannot read private Team data. Owner/admin/manager/member permissions apply only to Teams.

Project access remains governed by Projects RPCs, roles, grants, visibility, and RLS. Team-project link metadata is not an access grant.

## 6. RPC contracts (logical names; align prefixes with existing conventions)

### team_create
Inputs: p_name text, p_description text default null. Actor derived from auth.uid().

Checks: authentication, team.create entitlement or owner override, normalized name length, anti-abuse/rate limit.

Atomic steps: resolve capability; insert Team; insert active owner membership role=owner; write audit; return ID and minimal Team data. Any failure rolls back the entire transaction.

Failure states include unauthenticated, entitlement denied, invalid input, rate limit, constraint conflict, and internal failure.

### team_list_my
No inputs. Return only Teams where caller has active membership: ID, name, description, status, caller role, optional member count, created_at. Never accept a target user UUID.

### team_get
Input p_team_id uuid. Requires active membership. Returns Team metadata and caller role. Member details should be a separate, privacy-minimized contract.

### Later contracts
- team_update: allow-listed fields; owner/admin only; owner identity immutable.
- team_members_list: active members only; no email, birth date, auth metadata, or sensitive profile fields by default.
- team_invite / team_invitation_accept / team_invitation_decline: Team manager permission; recipient identity enforced from auth.uid().
- team_project_link / team_project_unlink: Team permission plus Projects-domain authority validation; never grant Project access.

## 7. Privileges and RLS

- Do not add teams schema to exposed API schemas without explicit approved need.
- Revoke direct table/schema privileges from PUBLIC, anon, and client roles by default.
- Grant execute only on approved API RPC wrappers.
- Internal privileged functions belong in a non-exposed schema.
- SECURITY DEFINER functions require fixed safe search_path, schema-qualified relations, explicit auth checks, and no unnecessary dynamic SQL.
- Avoid broad authenticated grants on base tables.
- RLS, where applicable, is defense in depth—not a replacement for RPC authorization.
- Client cannot directly modify ownership, roles, status, entitlement, or audit records.
- Audit is append-only.

Review final SQL against actual role grants, API schemas, SECURITY DEFINER patterns, and Projects specification before migration.

## 8. Audit events

MVP events:
- team.created
- team.owner_membership.created

Future events: team.updated, member invited/accepted/declined/role_changed/suspended/removed, project linked/unlinked, archived/restored.

Audit fields: event UUID, Team UUID, actor UUID (nullable only for trusted system actions), event key, timestamp, minimal metadata. Never store passwords, tokens, payment data, invitation secrets, or full profile snapshots.

## 9. Migration status

Applied to Supabase project yajybgdorhxebbigwjgi:

- Migration 20261124075310 — teams_001_core_backend.
- Migration 20261124075324 — teams_002_entitlement_created_by_index.

The migrations create the non-exposed teams schema, core tables, RLS, internal SECURITY DEFINER functions, public SECURITY INVOKER RPC wrappers, least-privilege grants, and the supporting indexes. Invitations, Project links, billing, and member-management RPCs remain deferred.

Post-migration checks confirmed all four tables exist with RLS enabled, internal functions have fixed empty search_path, public RPC wrappers are SECURITY INVOKER, authenticated can execute approved RPCs but cannot read/write base tables directly, and anon cannot execute the Team creation RPC. Smoke testing of create/list/get was performed in a rolled-back transaction using the trusted owner identity. No test Team was retained.

Frontend integration now includes the Team domain input validator, Supabase RPC adapter, authenticated client methods, Team list, Team details, create dialog and read-only member list. The B2 invitation/notification-center migration is applied to development Supabase as `20261124083432`; invitation UI is not yet implemented.

The invitation and shared notification inbox tables were added by the separately approved B2 migration `20261124083432` to the development database only. Editable role permissions, billing tables, and Team-project linking remain separate phases.

## 10. Indexes

- Unique membership pair (team_id, user_id).
- Membership lookup by user_id and active status where appropriate.
- Team owner lookup by owner_user_id.
- Future Team-project unique pair (team_id, project_id).
- Audit lookup by team_id and created_at descending.

Use partial indexes only when justified by query predicates. Avoid speculative indexing.

## 11. Acceptance/security tests

### Create
- Unauthenticated user denied.
- Ordinary user without entitlement denied.
- Ordinary user with entitlement allowed.
- Ecosystem owner allowed without entitlement.
- Invalid/blank/too-short/too-long names denied.
- Client cannot spoof owner.
- Team and owner membership created atomically.
- Audit failure rolls back creation.
- Exactly one active owner membership.

### Membership and access
- Active member can access permitted Team data.
- Suspended member denied.
- Non-member denied private Team data.
- Caller cannot query arbitrary user membership to infer private data.
- Client cannot escalate role.

### Project boundary
- Team association grants no Project access.
- Team membership alone does not grant Project access.
- Unlink leaves existing Project permissions unchanged.
- Projects domain independently validates linking authority.

### Audit/privileges
- Mutation creates audit.
- Client cannot alter/delete audit.
- Direct table writes denied.
- RPC enforces auth and least privilege.
- SECURITY DEFINER search_path is fixed.

### Entitlement lifecycle
- Revocation blocks new Team creation.
- Existing Teams and members are retained.
- Owner free-creation bypass is limited to capability check.

## 12. Open implementation decisions

1. Anti-abuse creation limit/rate.
2. Confirm trusted owner metadata integrity or introduce owner registry.
3. Decide whether temporary entitlement resolver is implemented now or waits for shared entitlements.
4. Confirm Projects-domain validation contract before Team-project linking.
5. Invitations and member-management scope/timing.

Recommended MVP: duplicate names allowed, no slug, description optional, no billing table, no invitation implementation, no Project links until contract review.

## 13. Implementation phases

**Phase A — Core:** tables, owner invariant, create capability, owner exception, create/list/get RPCs, audit, security tests.

**Phase B — Team management:** members list, registered-user invitations, acceptance/decline, suspension/removal, role management, audit.

**Phase C — Project association:** explicit Team-project links with Projects-domain authority validation, without access synchronization.

**Phase D — Monetization:** shared entitlements, billing, renewals/cancellations, grace periods, admin grants.

## 14. Next phase specification

The membership and invitation design is documented in [Teams Membership and Invitations Specification](./teams-membership-invitations-specification.md). It defines role hierarchy, invitation lifecycle, RPC contracts, privacy boundaries, audit events, frontend behavior, and acceptance tests. It documents the B2 invitation and notification-center design. The B2 SQL draft is prepared after live schema verification, but has not been applied; application requires separate explicit approval.

## 15. Implementation boundary

Phase A database migrations and the initial Team workspace frontend are implemented in the development environment. The work does not modify authentication internals, existing Projects tables/RLS, or production website code. Team invitations, notification center, member management, project association, and billing are not implemented. The B2 database migration exists only as a reviewed draft. Any further database changes require a separate reviewed migration.
