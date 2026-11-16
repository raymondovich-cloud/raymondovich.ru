# Projects — SQL Specification

**Version:** 2.4.0  
**Status:** Architecture specification — review required before migration  
**Created:** 2026-11-16  
**Updated:** 2026-11-16  
**Target repository:** `raymondovich-cloud/r.ru-Development`  
**Supabase project:** `yajybgdorhxebbigwjgi`  
**Database schema:** `projects`

---

## 1. Purpose and implementation boundary

This document defines the target PostgreSQL data model, constraints, authorization model, server-side operations, migration order and security tests for the Raymondovich Projects subsystem.

It is a specification, not an executable migration. No database changes are authorized by this document alone.

### 1.1 In scope

- Independent projects and arbitrarily nested project hierarchy.
- Ownership, membership, project-scoped roles and permissions.
- Invitations and acceptance.
- Confidentiality, public publication and profile listings.
- Future-facing links to Tools and project-owned resources, without implementing the Tools subsystem.
- Archiving, restoration, controlled physical deletion and ownership transfer.
- Immutable audit trail.
- RLS, RPC contracts and transaction boundaries.

### 1.2 Out of scope for this release

- Tasks and task management tables.
- Tools catalog, tool connections storage, credentials and subscription billing.
- Showcase categories, paid placements, advertising inventory and promotion orders.
- Public project pages frontend.
- Cross-hierarchy resource sharing.
- Account deletion implementation itself; only the Projects-side blockers and required integration contract are defined here.

Old Projects/Tools implementations and their historical table designs are not to be reused automatically. The current database audit found no Projects or Tools tables in the inspected application schemas. The new implementation is designed independently.

---

## 2. Existing Supabase environment and integration constraints

The specification targets the existing Supabase project in region `eu-central-1`.

### 2.1 Existing identity source

Authentication identity remains Supabase Auth:

- User primary identity: `auth.users.id` (UUID).
- Profile data source: `private.user_profiles`.
- Existing profile fields include `user_id`, `full_name`, `birth_date`, `username`, `created_at`, `updated_at`.
- Username is immutable in the existing profile workflow and has a case-insensitive unique index based on `lower(username)`.
- Membership and ownership rows store UUIDs, never usernames or email addresses.

Do not create a second users table for Projects.

### 2.2 Existing authentication functions and triggers

The current database contains registration-related functions/triggers, including:

- `private.assign_default_user_role`
- `private.create_user_profile_after_signup`
- `private.enforce_registration_gate`

Projects migrations must not replace, rename or silently alter these objects. Before implementation, migration SQL must be checked against the live definitions and trigger ordering.

The existing function `public.lookup_auth_user_for_username` is not a public search API for Projects. A dedicated, privacy-filtered lookup contract is required.

### 2.3 Schema exposure

Create a dedicated PostgreSQL schema named `projects`.

Target security posture:

- Do not add `projects` to Supabase Data API exposed schemas unless a later reviewed design explicitly requires it.
- Do not grant `anon` direct access to Projects tables.
- Prefer authenticated client calls to narrowly scoped RPC functions.
- Revoke default execution privileges from `PUBLIC`; grant only to the intended database roles.
- Keep privileged helper functions in a non-exposed schema where practical.
- Never put service-role credentials or tool secrets in browser code.

The exact Supabase API exposure configuration and schema-usage grants must be checked immediately before deployment. A PostgreSQL schema being created does not by itself make it safe or accessible through the Data API.

---

## 3. Product invariants

These invariants are mandatory and must be enforced server-side, not only in the interface.

### 3.1 Project and hierarchy

1. Any registered user may create a project without a paid subscription.
2. The creator becomes the initial owner.
3. A project is an independent product or business unit.
4. A project may have zero or one direct parent; nesting depth is not artificially limited.
5. A child is a full project with its own workspace, settings, members, permissions, history and future tool assignments.
6. A child project owner must always equal the owner of its direct parent. This equality therefore applies throughout the complete descendant tree.
7. A child may have a leader who is not the owner.
8. A project cannot be its own parent and hierarchy cycles are prohibited.
9. Parent membership does not grant access to children. Child membership does not grant access to the parent.
10. The parent owner has full administrative authority over all descendants without separate memberships.
11. An archived parent blocks public availability of every descendant, even if a descendant is internally active.
12. Archiving a project does not automatically archive its descendants.

### 3.2 Ownership and membership

- Ownership is determined only by `projects.projects.owner_user_id`, not by a membership row.
- A user has at most one current membership/role per project.
- A user may hold different roles in different projects.
- A project owner is not required to have a membership row.
- Parent owner is the hierarchy super-administrator.
- Other users receive access only through an active membership and permissions.
- Removing or suspending membership blocks ordinary access immediately.
- An owner transfer applies atomically to the root project and all descendants after explicit acceptance by the new owner.

### 3.3 Privacy and publication

- Confidentiality is independent of workspace permissions.
- Public visibility never grants internal workspace access.
- A public publication is a safe, explicit projection of approved public fields; it is never a raw Projects row.
- A private ancestor makes every descendant effectively private.
- A public parent may contain a private child.
- A project may be published without being listed in a user profile or showcase.
- Membership alone does not authorize a project to appear in a member's profile.
- Paid promotion, when implemented, must never grant access or override privacy.

### 3.4 Lifecycle

- Archive is the normal reversible lifecycle operation.
- Physical deletion is exceptional and requires an explicit protected server-side operation.
- Parent physical deletion is blocked while child projects exist.
- No automatic cascade deletion of child projects, histories, connections or shares.
- Account deletion is blocked while the user owns any project or is the sole administrator of a project.

---

## 4. PostgreSQL schema and conventions

Create schema:

```sql
create schema if not exists projects;
```

The statement above is illustrative only; it must not be executed until the complete migration is approved.

Conventions:

- UUID primary keys generated with `gen_random_uuid()`.
- Timestamps use `timestamptz` and UTC storage.
- Foreign keys to identities reference `auth.users(id)`.
- Use explicit named constraints and indexes.
- Use CHECK constraints for finite state values.
- Use normalized relation tables for permissions; do not encode permission matrices in JSONB.
- JSONB is allowed only for audit snapshots/metadata, never as the authoritative permission model.
- Every mutable business table has `created_at` and `updated_at` where appropriate.
- Use `ON DELETE RESTRICT` for critical relationships unless a specific lifecycle rule explicitly states otherwise.
- No client-side direct writes to critical tables.

---

## 5. Entity relationship overview

Core entities:

- `projects.projects` — project records and hierarchy.
- `projects.project_component_types` — supported technical component types.
- `projects.project_components` — normalized many-to-many relation between projects and supported components; a project may have multiple components.
- `projects.project_memberships` — active/suspended/removed membership records.
- `projects.project_roles` — system and project-local roles.
- `projects.project_permissions` — permission catalogue.
- `projects.project_role_permissions` — role-to-permission assignments.
- `projects.project_access_grants` — individual allow/deny overrides.
- `projects.project_invitations` — invitation lifecycle.
- `projects.project_visibility` — confidentiality and listing preferences.
- `projects.project_publications` — public-facing project projection.
- `projects.project_profile_listings` — owner-authorized project listing in user profiles.
- `projects.project_tool_connections` — future Tools integration reference.
- `projects.project_resource_shares` — resource sharing inside one hierarchy.
- `projects.project_resource_permissions` — normalized permissions for each share.
- `projects.project_ownership_transfers` — ownership transfer workflow.
- `projects.project_audit_logs` — immutable audit history.

Future monetization entities such as showcase placements and promotion orders are intentionally deferred.

---

## 6. Table specifications

### 6.1 `projects.projects`

One row represents one independent project.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | Primary key |
| `parent_project_id` | UUID | No | Self-reference to parent |
| `owner_user_id` | UUID | Yes | FK to `auth.users.id` |
| `created_by` | UUID | Yes | FK to `auth.users.id`; immutable creator |
| `name` | VARCHAR(120) | Yes | Trimmed; non-empty |
| `description` | TEXT | No | Internal description only |
| `project_type` | TEXT | Yes | `online` or `offline` |
| `component_type_id` | UUID | No | Legacy transition field only; deprecated in favour of `project_components` |
| `status` | TEXT | Yes | `active` or `archived` |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |
| `archived_at` | TIMESTAMPTZ | No | Required when archived |
| `archived_by` | UUID | No | FK to `auth.users.id` |

Constraints and indexes:

- PK on `id`.
- `CHECK (project_type IN ('online','offline'))`.
- `CHECK (status IN ('active','archived'))`.
- `CHECK (parent_project_id IS NULL OR parent_project_id <> id)`.
- Archive consistency: active means `archived_at IS NULL`; archived means `archived_at IS NOT NULL`.
- `UNIQUE (id, owner_user_id)` to support the composite parent/owner relationship.
- Composite self-FK `(parent_project_id, owner_user_id)` references `(id, owner_user_id)`, enforcing equal owner between parent and child. Evaluate `ON UPDATE CASCADE` in a staging migration test; the transfer transaction must still explicitly lock and validate the complete tree.
- Parent deletion is restricted while children exist.
- Index `parent_project_id`, `owner_user_id`, `created_by`, `status`; add partial indexes for common active-project queries.
- Name validation and trimming occur in the server operation; do not rely only on a client form.
- No internal slug. Public slug belongs to the publication entity.

Hierarchy cycle prevention cannot be guaranteed by a simple CHECK constraint. The server operation must use a recursive traversal, transaction-level locking and a cycle check.

### 6.2 `projects.project_component_types`

Catalogue of technical component subtypes. The catalogue is independent of `project_type`.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `code` | VARCHAR(60) | Yes | Unique stable code |
| `name` | VARCHAR(100) | Yes | Display name |
| `description` | TEXT | No | Optional |
| `is_active` | BOOLEAN | Yes | Default true |
| `sort_order` | INTEGER | Yes | Default 0 |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

Initial codes:

- `website`
- `telegram_mini_app`
- `telegram_bot`
- `ios_app`

The catalogue may be extended later. A project can have zero or more component types when it represents one or several technical products; an online project may combine a website, Telegram Mini App, Telegram Bot and iOS app. Offline projects cannot declare online components. The legacy scalar `projects.projects.component_type_id` is retained temporarily for migration compatibility, backfilled into `project_components`, and must not be written by new code. Remove it only in a later migration after all consumers have moved. A project can have no component when it represents an organizational or functional direction rather than a specific technical component. Online/offline remains a separate project classification.

### 6.3 `projects.project_memberships`

One current membership record per project and user. Removed membership rows are retained for history; rejoining reactivates the existing row or follows a documented re-invitation transition.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | Yes | FK projects |
| `user_id` | UUID | Yes | FK auth.users |
| `role_id` | UUID | Yes | FK project_roles |
| `status` | TEXT | Yes | active/suspended/removed |
| `joined_at` | TIMESTAMPTZ | No | Set on acceptance |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

Constraints:

- Unique `(project_id, user_id)`.
- Status CHECK: `active`, `suspended`, `removed`.
- Role scope must match the target project scope (parent or child); enforce in RPC/trigger because it depends on another row.
- The project owner is not represented as a membership.
- Active membership is created only after an invitation is explicitly accepted, except the creator/owner flow.
- Membership role changes must be audited.

### 6.4 `projects.project_roles`

System roles have `project_id IS NULL`; custom roles are bound to one project.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | No | FK projects; null for system role |
| `scope` | TEXT | Yes | parent/child |
| `code` | VARCHAR(60) | Yes | Stable code |
| `name` | VARCHAR(100) | Yes | Display name |
| `description` | TEXT | No | Optional |
| `is_system` | BOOLEAN | Yes | Default false |
| `created_by` | UUID | No | FK auth.users |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

Rules:

- System roles are centrally managed and cannot be edited/deleted by project users.
- Custom roles require the relevant role-management permission and are scoped to one project only.
- Custom roles never propagate to descendants.
- Do not delete a role while any membership references it.
- Enforce consistency: system role has null project_id; custom role has non-null project_id.
- Unique system role code per scope; unique custom role code per project.

Initial system roles:

| Scope | Code | Name |
|---|---|---|
| parent | administrator | Administrator |
| parent | manager | Manager |
| parent | member | Member |
| child | leader | Leader |
| child | developer | Developer |
| child | observer | Observer |

Owner is not a role. Ownership remains a separate property.

### 6.5 `projects.project_permissions`

Global permission catalogue. The approved role matrix also requires `audit.view` (view project audit history); include it in the canonical seed catalogue.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `code` | VARCHAR(100) | Yes | Unique |
| `name` | VARCHAR(120) | Yes | Required |
| `description` | TEXT | No | Optional |
| `created_at` | TIMESTAMPTZ | Yes | Server default |

Initial permission codes:

- `project.view`
- `project.update`
- `project.archive`
- `members.view`
- `members.invite`
- `members.remove`
- `members.manage`
- `members.roles.manage`
- `roles.create`
- `roles.update`
- `roles.delete`
- `tools.view`
- `tools.connect`
- `tools.manage`
- `visibility.view`
- `visibility.manage`
- `publication.manage`
- `resources.view`
- `resources.manage`

Task permissions may be added when the Tasks subsystem is specified; task tables are not part of this release.

### 6.6 `projects.project_role_permissions`

Many-to-many mapping between roles and permissions.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `role_id` | UUID | Yes | FK project_roles |
| `permission_id` | UUID | Yes | FK project_permissions |
| `created_at` | TIMESTAMPTZ | Yes | Server default |

- Composite PK `(role_id, permission_id)`.
- System role mappings are seeded by migration.
- Custom role mappings are changed only through authorized RPC.
- Role permission scope must be validated against project scope.

Initial system-role permission matrices must be explicitly seeded and reviewed before release. Do not infer them from role names in application code.

### 6.7 `projects.project_access_grants`

Individual permission overrides for a user in one project.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | Yes | FK projects |
| `user_id` | UUID | Yes | FK auth.users |
| `permission_id` | UUID | Yes | FK project_permissions |
| `effect` | TEXT | Yes | allow/deny |
| `granted_by` | UUID | Yes | FK auth.users |
| `expires_at` | TIMESTAMPTZ | No | Optional expiry |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

Constraints and semantics:

- Unique `(project_id, user_id, permission_id)`: one current override.
- CHECK effect in `allow`, `deny`.
- An explicit deny overrides role-based allow.
- Expired grants are ignored.
- Active membership is required for ordinary grants to take effect.
- Owner and ancestor-owner super-administrator authority cannot be denied by a normal project grant.
- Grant changes are audited; do not rely on overwriting old values as the only history.

### 6.8 `projects.project_invitations`

Invitation workflow for registered and unregistered invitees.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | Yes | FK projects |
| `invitee_user_id` | UUID | No | FK auth.users for known account |
| `invitee_email` | TEXT | No | Normalized email for unregistered invitee |
| `role_id` | UUID | Yes | FK project_roles |
| `invited_by` | UUID | Yes | FK auth.users |
| `token_hash` | TEXT | Yes | Store hash only |
| `status` | TEXT | Yes | pending/accepted/declined/expired/revoked |
| `expires_at` | TIMESTAMPTZ | Yes | Default policy: 7 days |
| `accepted_at` | TIMESTAMPTZ | No | Set on acceptance |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

Rules:

- Exactly one invitee target: user ID or email.
- Email is normalized before storing; do not expose it in member search results.
- Token must be generated with a cryptographically secure random generator; only a one-way hash is stored.
- Tokens are single-use and expire.
- A registered user is invited by immutable username lookup; the stored target is UUID.
- An unregistered person is invited by email, must register, verify the same email and explicitly accept.
- Registration alone does not accept an invitation.
- Acceptance must verify that the authenticated user matches the invitation target.
- Prevent duplicate pending invitations and invitations to existing active members.
- Rate-limit lookup, invitation creation and resend.
- Email delivery uses the configured email provider; delivery failure must not create membership.
- Revocation and expiration must prevent subsequent acceptance.

### 6.9 `projects.project_visibility`

Exactly one row per project.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `project_id` | UUID | Yes | PK and FK projects |
| `confidentiality` | TEXT | Yes | private/public |
| `showcase_visibility` | BOOLEAN | Yes | Default false |
| `profile_visibility` | BOOLEAN | Yes | Default false |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

- CHECK confidentiality in `private`, `public`.
- New projects default to private.
- Publication status does not belong in this table.
- Effective public availability must be computed across the full ancestor chain.
- A child cannot be effectively public if any ancestor is private or archived.
- This table does not grant internal workspace access.

### 6.10 `projects.project_publications`

Explicit safe public projection. One current publication record per project for the first release.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | Yes | FK projects; unique for current publication |
| `public_slug` | VARCHAR(160) | Yes | Globally unique |
| `title` | VARCHAR(160) | Yes | Public title |
| `public_description` | TEXT | No | Public description only |
| `cover_image` | TEXT | No | Validated public asset reference |
| `status` | TEXT | Yes | draft/published/suspended |
| `published_at` | TIMESTAMPTZ | No | Set when published |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

Rules:

- Unique `project_id` for current publication.
- Unique normalized `public_slug`.
- CHECK status in `draft`, `published`, `suspended`.
- Publishing requires project owner authorization (or a narrowly delegated publication permission, if explicitly allowed by policy).
- Public endpoint returns only explicitly selected publication fields and safe computed data.
- Never expose internal description, internal UUIDs, member email, invitations, audit data, tool connections or credentials.
- Effective public access requires publication status published, project active, project confidentiality public and every ancestor active/public.
- Publication history/versioning is deferred; if editorial history becomes necessary, add a separate revision table rather than overloading the current row.

### 6.11 `projects.project_profile_listings`

Explicit authorization for displaying a project in one or more user profiles.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | Yes | FK projects |
| `profile_user_id` | UUID | Yes | FK auth.users |
| `position` | INTEGER | Yes | Default 0 |
| `status` | TEXT | Yes | active/hidden |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

- Unique `(project_id, profile_user_id)`.
- CHECK status in `active`, `hidden`.
- Owner explicitly authorizes each profile listing.
- Membership alone does not authorize a listing.
- A listing cannot make a private or unpublished project public.
- The owner may revoke listing authorization.
- Whether the profile user must be a project member is intentionally not required by the approved product rule; do not add that restriction without a separate product decision.

### 6.12 `projects.project_tool_connections`

Reference from Projects to the future Tools subsystem. This table does not implement Tools.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | Yes | FK projects |
| `tool_code` | VARCHAR(60) | Yes | Neutral integration code |
| `connection_id` | UUID | Yes | Future Tools connection identifier; deliberately no FK yet |
| `connected_by` | UUID | Yes | FK auth.users |
| `status` | TEXT | Yes | active/suspended/disconnected/error |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

Rules:

- No FK to legacy or nonexistent Tools tables.
- No secrets, access tokens or credentials in this table.
- Entitlement/subscription checks belong to the future Tools subsystem.
- Project ownership does not grant paid tool entitlements.
- Tool permission and project permission are both checked before use.
- Connection access is mediated server-side.

### 6.13 `projects.project_resource_shares`

A resource owned by one project may be shared with a consumer project inside the same hierarchy.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `resource_owner_project_id` | UUID | Yes | FK projects |
| `consumer_project_id` | UUID | Yes | FK projects |
| `resource_type` | VARCHAR(60) | Yes | Resource category |
| `resource_id` | UUID | Yes | Identifier in owning subsystem |
| `status` | TEXT | Yes | active/suspended/revoked |
| `shared_by` | UUID | Yes | FK auth.users |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |
| `revoked_at` | TIMESTAMPTZ | No | Set on revocation |

Rules:

- CHECK status in `active`, `suspended`, `revoked`.
- Owner and consumer must be distinct projects.
- First release allows sharing only within one project hierarchy (ancestor/descendant relationship).
- Cross-hierarchy sharing is deferred.
- Consumer project cannot re-share a resource it only consumes.
- Resource owner controls sharing and revocation.
- Revoking one share does not affect other consumers.
- Suspension of the underlying connection/resource blocks usage even if the share remains active.
- Do not copy resource secrets into the consumer project.

### 6.14 `projects.project_resource_permissions`

Normalized permissions for an individual resource share.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `resource_share_id` | UUID | Yes | FK project_resource_shares |
| `permission_code` | VARCHAR(100) | Yes | Resource action code |
| `effect` | TEXT | Yes | allow/deny |
| `granted_by` | UUID | Yes | FK auth.users |
| `expires_at` | TIMESTAMPTZ | No | Optional expiry |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `updated_at` | TIMESTAMPTZ | Yes | Server-maintained |

- Unique `(resource_share_id, permission_code)`.
- CHECK effect in `allow`, `deny`.
- Permissions are evaluated server-side on every resource operation.
- Consumer project never receives credential material.
- A consuming project cannot grant permissions beyond the resource owner's share policy.

### 6.15 `projects.project_ownership_transfers`

Explicit acceptance workflow for transfer of an entire hierarchy.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `root_project_id` | UUID | Yes | FK projects |
| `previous_owner_id` | UUID | Yes | FK auth.users |
| `new_owner_id` | UUID | Yes | FK auth.users |
| `initiated_by` | UUID | Yes | FK auth.users |
| `token_hash` | TEXT | Yes | Hashed confirmation token |
| `status` | TEXT | Yes | pending/accepted/expired/cancelled |
| `expires_at` | TIMESTAMPTZ | Yes | Explicit expiry |
| `created_at` | TIMESTAMPTZ | Yes | Server default |
| `completed_at` | TIMESTAMPTZ | No | Set on completion |

Rules:

- New owner must already have a registered account and verified email.
- New owner explicitly confirms the transfer.
- Transfer remains pending until confirmation.
- On confirmation, one transaction locks the hierarchy and updates owner for root and every descendant.
- Owner equality between parent and child must remain valid throughout the committed state.
- Resource/tool connections do not transfer automatically; they remain subject to their own ownership and provider rules.
- Previous owner does not retain administrative rights automatically. They may remain only through an explicit membership.
- Reject or cancel stale pending transfers when a conflicting transfer is initiated.
- Transfer initiation and completion are audited.

### 6.16 `projects.project_audit_logs`

Append-only audit history.

| Column | Type | Required | Rules |
|---|---|---:|---|
| `id` | UUID | Yes | PK |
| `project_id` | UUID | No | FK projects, nullable after deletion |
| `project_id_snapshot` | UUID | Yes | Original project UUID retained |
| `actor_user_id` | UUID | No | FK auth.users; nullable for system actor |
| `event_code` | VARCHAR(100) | Yes | Stable event identifier |
| `entity_type` | VARCHAR(60) | Yes | Affected entity type |
| `entity_id` | UUID | No | Affected entity identifier |
| `old_values` | JSONB | No | Redacted snapshot |
| `new_values` | JSONB | No | Redacted snapshot |
| `metadata` | JSONB | No | Safe event metadata |
| `request_id` | UUID | No | Correlation identifier |
| `created_at` | TIMESTAMPTZ | Yes | Server timestamp |

Rules:

- Client roles cannot insert, update or delete audit rows.
- Audit records are append-only.
- Do not store passwords, PINs, tokens, secrets, raw invitation tokens or tool credentials.
- Use `project_id_snapshot` to preserve historical association after project deletion.
- `project_id` may become null after a permitted deletion; audit history itself is retained.
- Read access is permission-controlled and must not expose sensitive snapshots to ordinary members.
- Index `project_id_snapshot, created_at`, `actor_user_id, created_at`, and `event_code, created_at`.

Initial event codes:

- `project.created`
- `project.updated`
- `project.archived`
- `project.restored`
- `project.deleted`
- `ownership_transfer.initiated`
- `ownership_transfer.completed`
- `member.invited`
- `member.joined`
- `member.removed`
- `member.suspended`
- `member.role_changed`
- `permission.granted`
- `permission.revoked`
- `visibility.changed`
- `publication.published`
- `publication.suspended`
- `resource.shared`
- `resource.access_revoked`
- `tool.connected`
- `tool.disconnected`

---

## 7. Authorization model

### 7.1 Evaluation order

A central server-side authorization function (logical name: `projects.project_has_permission`) must evaluate:

1. Resolve the authenticated identity from `auth.uid()`; do not trust a client-supplied actor ID.
2. Verify the target project exists and is in the relevant lifecycle state.
3. If the actor is the project owner, allow owner-level administrative operations.
4. If the actor owns the root ancestor of the target project, allow hierarchy super-administrator operations.
5. Otherwise require active membership in the exact target project.
6. Resolve the member's role and role-permission mapping.
7. Apply unexpired individual permission overrides.
8. Explicit deny overrides ordinary role allow.
9. Suspended or removed membership denies ordinary project access.
10. Return a boolean or structured denial code; never return sensitive membership data as a side effect.

Parent membership is not inherited by child projects. Only the parent owner receives hierarchy-wide super-administrator authority.

### 7.2 Owner precedence

- Owner is determined by `projects.owner_user_id`.
- The owner cannot be denied by `project_access_grants`.
- Parent owner authority extends to all descendants.
- A child leader can manage delegated child operations but cannot change the owner or bypass parent-owner control.
- Ownership and role are separate dimensions.

### 7.3 Public access

Public access uses a separate function (logical name: `projects.project_is_publicly_available`).

It must verify the target and every ancestor:

- publication exists and status is `published`;
- target project is active;
- target confidentiality is public;
- every ancestor is active;
- every ancestor confidentiality is public.

Public endpoint must select only safe publication columns. Internal workspace policies must never be reused as public publication policies.

### 7.4 RLS strategy

Enable RLS on every Projects table.

Baseline:

- `anon`: no direct table access.
- `authenticated`: no direct INSERT/UPDATE/DELETE on critical tables.
- Authenticated SELECT is granted only where a reviewed RLS policy and schema/API exposure model require it.
- Critical writes occur through narrowly scoped RPC functions.
- Audit table is append-only and not client-writable.
- Public publication reads use a safe server endpoint or a reviewed safe projection; do not expose base tables.
- Use `SECURITY INVOKER` for views that should obey caller RLS. Any `SECURITY DEFINER` view/function requires explicit security review.

RLS policies must be written per table and operation. A single broad policy across all tables is not acceptable.

### 7.5 SECURITY DEFINER requirements

Every privileged function must:

- use a fixed safe `search_path` (prefer `pg_catalog` and fully qualified object names);
- fully qualify table/function references;
- derive the caller from `auth.uid()` where called by a user session;
- reject unauthenticated calls unless explicitly designed otherwise;
- not trust caller-supplied actor IDs or owner IDs;
- avoid unsafe dynamic SQL;
- have least-privilege ownership;
- revoke execution from `PUBLIC` and grant only to intended roles;
- avoid returning rows/columns outside the function's purpose;
- be tested under authenticated, anonymous and service-role contexts.

Do not create a general-purpose privileged SQL execution function.

---

## 8. RPC contracts and transaction boundaries

RPCs are the only supported client write path for critical Projects operations. Exact SQL signatures and JSON response shapes are finalized in the executable migration design, but the operation contracts below are normative.

| RPC | Purpose | Transactional requirements |
|---|---|---|
| `project_create` | Create root or child project | Insert project, default visibility and audit atomically |
| `project_update` | Update permitted project fields | Validate permission and immutable fields |
| `project_archive` | Archive one project | Update status, stop publication availability, audit atomically |
| `project_restore` | Restore one archived project | Restore internal state; ancestors still govern public access |
| `project_delete` | Physical deletion after checks | Lock project; reject children/dependencies; preserve audit |
| `project_transfer_initiate` | Start ownership transfer | Verify owner, target account and hierarchy; create pending transfer |
| `project_transfer_confirm` | Confirm transfer | Lock and atomically update entire hierarchy; audit |
| `project_member_invite` | Invite registered/unregistered person | Validate inviter, role scope, duplicate membership/invite and rate limit |
| `project_invitation_accept` | Accept invitation | Verify identity/email/token; create or reactivate membership atomically |
| `project_invitation_decline` | Decline invitation | Validate invitee and pending state |
| `project_member_remove` | Remove member | Prevent invalid owner/admin removal; audit |
| `project_member_role_update` | Change member role | Validate role scope and authority; audit |
| `project_permission_update` | Add/update/remove individual override | Validate membership, permission and authority; audit |
| `project_visibility_update` | Update confidentiality/listing flags | Validate owner-level authority; audit |
| `project_publication_update` | Create/update/publish/suspend projection | Validate publication authority and effective ancestor visibility |
| `project_resource_share` | Share project resource | Validate same hierarchy, ownership and permission scope |
| `project_resource_revoke` | Revoke one resource share | Revoke only selected share; audit |
| `project_access_check` | Check permission | Read-only, caller identity derived server-side |

### 8.1 Atomic project creation

One transaction must:

1. Validate authenticated user.
2. Validate parent (if provided), active state and owner equality.
3. Validate project type and component type.
4. Create project with creator as owner for root project, or inherited parent owner for child.
5. Create default private visibility row.
6. Create required audit event.
7. Return the created project DTO.

Any failure rolls back all writes.

### 8.2 Hierarchy mutation and cycle protection

For create-child, reparent (if ever supported), transfer and delete:

- Acquire transaction-scoped advisory lock keyed to hierarchy/root, or another proven serialization lock.
- Lock relevant project rows in deterministic order.
- Use recursive CTE to enumerate ancestors/descendants.
- Reject self-parent and any cycle.
- Verify owner equality for every affected edge.
- Keep all hierarchy changes in one transaction.
- Test concurrent attempts to mutate the same hierarchy.

Reparenting is not part of the initial user-facing release. If introduced later, it requires a separate reviewed operation because it changes ownership and inherited visibility semantics.

### 8.3 Atomic ownership transfer

On confirmation:

1. Verify token hash, pending status, expiry and authenticated new owner.
2. Verify new owner's account and verified email.
3. Lock root and every descendant.
4. Verify every descendant still has the previous owner.
5. Update owner for the full descendant set in one transaction.
6. Ensure composite parent/owner constraints remain satisfied.
7. Mark transfer accepted/completed.
8. Write audit events for the hierarchy.
9. Commit.

No partial ownership transfer is allowed.

### 8.4 Archive and restore

- Archive affects only the selected project.
- It stops that project's public publication from being served.
- Descendants are not automatically marked archived.
- Descendants under an archived ancestor are effectively unavailable publicly.
- Restore changes only the selected project's internal status.
- A restored child remains publicly unavailable while any ancestor is archived or private.

### 8.5 Physical deletion

`project_delete` must reject deletion if any of the following remain:

- child projects;
- active or historical references that must be retained;
- tool connection records that cannot safely be detached;
- resource shares;
- active publication records or other external references;
- financial orders or billing references, when those modules exist;
- unresolved transfer/invitation operations where deletion would invalidate security history.

A parent cannot be physically deleted while children exist. No cascade deletion of descendants.

Before deleting a project row, write a final audit event and preserve its identifier in `project_id_snapshot`. The exact retention strategy for child records must be specified per FK; audit logs must survive.

---

## 9. Account deletion integration

Projects must expose a protected, server-side account-deletion preflight contract for the account lifecycle service.

Deletion is blocked when:

1. The user owns any project, including archived projects and any descendant.
2. The user is the sole active administrator of any project where administrator continuity is required.
3. A pending ownership transfer or other critical dependency makes deletion unsafe.

The user must transfer ownership before account deletion. If they are the sole administrator, another administrator must be appointed first.

Important implementation note: RLS alone does not protect deletion from `auth.users`. The actual Supabase Auth deletion path must be inspected and integrated with a controlled server-side account deletion flow. Do not assume a database policy or a profile FK cascade can prevent Auth user deletion.

The existing `private.user_profiles.user_id` cascade is not sufficient protection for Projects. Projects identity FKs must use restrictive deletion behavior, and the account deletion service must run the preflight before calling the Auth Admin deletion API. A privileged service key must never be exposed to the browser.

---

## 10. Username lookup and invitation privacy

A dedicated function (logical name: `projects.project_user_lookup`) is required.

Input:
- normalized username query;
- bounded result limit.

Output:
- user UUID;
- immutable username;
- explicitly approved public display name/avatar fields only, if available.

Never return:
- email;
- birth date;
- private profile fields;
- auth metadata;
- whether an arbitrary email exists.

Search rules:

- case-insensitive exact or controlled prefix search; do not allow unbounded wildcard scans;
- require authenticated caller;
- apply rate limiting;
- return minimal result fields;
- membership/invitation creation stores UUID, not username;
- invitation to unregistered person is email-based and handled separately.

The exact search mode (exact match only vs prefix suggestions) must be fixed in API contract before implementation. Default security recommendation: exact username lookup for the first release.

---

## 11. Indexing requirements

Minimum indexes:

### projects.projects
- `parent_project_id`
- `owner_user_id`
- `created_by`
- `status`
- partial index for active projects by owner, if query plans justify it.

### project_memberships
- unique `(project_id, user_id)`
- `user_id, status`
- `project_id, status`

### project_roles
- unique system role key by scope/code
- unique custom role key by project/code

### project_access_grants
- unique `(project_id, user_id, permission_id)`
- `user_id, expires_at`

### project_invitations
- unique token hash
- indexes for pending invitations by project and invitee
- partial unique index to prevent duplicate pending invitation per target/project/role policy.

### project_visibility
- PK on `project_id`.

### project_publications
- unique `project_id`
- unique normalized `public_slug`
- index `status`.

### project_profile_listings
- unique `(project_id, profile_user_id)`
- `profile_user_id, status, position`.

### project_resource_shares
- `resource_owner_project_id, status`
- `consumer_project_id, status`
- resource lookup key `(resource_type, resource_id)`.

### project_ownership_transfers
- `root_project_id, status`
- `new_owner_id, status`
- unique token hash.

### project_audit_logs
- `project_id_snapshot, created_at DESC`
- `actor_user_id, created_at DESC`
- `event_code, created_at DESC`.

Final indexes must be validated against representative query plans. Avoid speculative indexes that increase write cost without a real query.

---

## 12. Migration plan

Migrations are to be created only after the specification is approved and the live database is re-inspected.

Recommended sequence:

1. **Preflight snapshot** — capture current schemas, constraints, functions, triggers, grants, RLS policies and migration history.
2. **Schema and catalogues** — create `projects` schema, component types, permission catalogue and role catalogue.
3. **Core project model** — create `projects`, memberships and role-permission relations.
4. **Authorization layer** — create access grants, permission evaluation functions and RLS policies.
5. **Invitations** — create invitation table and invitation RPCs.
6. **Visibility/publication** — create visibility, publication and profile listing tables/functions.
7. **Resource integration references** — create tool connection references and resource sharing tables; no dependency on a Tools table.
8. **Lifecycle and transfer** — create ownership transfer, archive/restore/delete RPCs and account-deletion preflight.
9. **Audit hardening** — enforce append-only audit behavior and complete event coverage.
10. **Verification** — run migration checks, RLS tests, concurrency tests and end-to-end acceptance tests.

Every migration must be reversible where safe. Destructive rollback is not automatic; production rollback must preserve user-created data.

---

## 13. Required security and correctness tests

Before any production deployment, automated tests must cover at least:

### Identity and ownership
- A registered user can create a root project without subscription.
- Creator becomes owner.
- Child inherits exact parent owner.
- Client cannot submit another user's owner ID to create a project.
- Parent owner can administer descendants without descendant membership.
- Parent member cannot access a child by inheritance.
- Child member cannot access parent by inheritance.
- Child leader cannot override parent owner.

### Hierarchy
- Self-parent rejected.
- Direct and indirect cycles rejected.
- Concurrent hierarchy mutations cannot create cycles.
- Parent/child owner mismatch cannot commit.
- Ownership transfer changes every descendant atomically.
- Failed transfer leaves every owner unchanged.

### Membership and roles
- One membership per project/user.
- Role scope mismatch rejected.
- Suspended/removed member loses access.
- Custom roles are project-scoped and do not propagate.
- System roles cannot be modified by ordinary project admins.
- Explicit deny overrides role allow.
- Owner/ancestor owner cannot be denied by ordinary grants.

### Invitations
- Registered user invitation resolves to UUID.
- Unregistered invite requires registration, email verification and explicit acceptance.
- Wrong account cannot accept.
- Expired/revoked/used token cannot be accepted.
- Duplicate pending invitations are blocked.
- Email delivery failure does not create membership.
- Rate limits are enforced.

### Privacy and publication
- New project defaults private.
- Public project does not expose internal workspace.
- Private ancestor blocks descendant public endpoint.
- Archived ancestor blocks descendant public endpoint.
- Publication draft/suspended is not public.
- Profile listing requires owner authorization.
- Membership alone does not create profile listing.
- Public response contains no email, internal description, UUIDs, audit or credentials.

### Resource sharing
- Only same-hierarchy sharing is allowed in release one.
- Consumer cannot re-share.
- One share can be revoked without affecting another consumer.
- Revoked/suspended share blocks use.
- Credentials are never returned to consumer.
- Tool entitlement is checked independently.

### Lifecycle and account deletion
- Archive preserves membership and audit history.
- Archiving a child does not affect siblings.
- Restore of a child under archived parent does not make it public.
- Parent deletion with children is rejected.
- Project deletion with dependencies is rejected.
- Account deletion is blocked for any owned project.
- Account deletion is blocked when user is sole administrator.
- Audit survives project deletion.

### Database security
- Anonymous role has no direct access to private project data.
- Authenticated user cannot write critical tables directly.
- RPCs reject spoofed user IDs.
- Privileged functions have fixed search paths and restricted EXECUTE grants.
- RLS is enabled on all Projects tables.
- No secret or service-role key is present in frontend artifacts.

---

## 14. Decisions intentionally deferred

The following are not blockers for the core schema, but must be settled before their respective features are implemented:

1. Exact permission matrix for each initial system role.
2. Whether username lookup is exact-only or offers prefix suggestions; recommended initial choice is exact-only.
3. Public profile display fields and avatar source.
4. Publication slug normalization, reserved words and slug change/redirect policy.
5. Whether publication revisions are required in the first public release.
6. Resource type catalogue and exact resource permission codes when Tools is designed.
7. Account deletion service implementation and Supabase Auth Admin integration.
8. Data retention period and legal policy for audit records.
9. Whether the owner may delegate publication to a specific role; default recommendation is owner-only.
10. Whether hidden profile listings are retained as rows or physically removed; default recommendation is retained with status `hidden`.

Do not silently resolve these deferred decisions by inventing behavior in application code.

---

## 15. Acceptance criteria for approving executable SQL

The specification is ready to become migration SQL only when:

- all table definitions and FK actions are internally consistent;
- initial role-permission matrices are explicitly approved;
- RLS policy matrix is documented table-by-table;
- every RPC has an exact signature, input validation, output contract and privilege grant;
- ownership transfer and hierarchy locking strategy has been validated in PostgreSQL;
- account deletion integration is designed against the actual Supabase Auth flow;
- schema exposure and grants are confirmed for this Supabase project;
- security tests are mapped to automated test cases;
- no old Projects/Tools implementation is implicitly reused;
- user explicitly approves the final executable migration plan.


---

## 16. Initial system-role permission matrix (normative proposal)

This section resolves the initial role-permission matrix using least privilege. It is the proposed release-one baseline. Ownership authority is not represented in this matrix.

Legend: **✓** granted by default; **—** not granted. An individual project grant may add or deny an eligible permission, but cannot grant owner-only actions or bypass hierarchy/privacy invariants.

| Permission | Parent administrator | Parent manager | Parent member | Child leader | Child developer | Child observer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `project.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `project.update` | ✓ | ✓ | — | ✓ | ✓ | — |
| `project.archive` | ✓ | — | — | ✓ | — | — |
| `members.view` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `members.invite` | ✓ | ✓ | — | ✓ | — | — |
| `members.remove` | ✓ | — | — | ✓ | — | — |
| `members.manage` | ✓ | — | — | ✓ | — | — |
| `members.roles.manage` | ✓ | — | — | — | — | — |
| `roles.create` | ✓ | — | — | — | — | — |
| `roles.update` | ✓ | — | — | — | — | — |
| `roles.delete` | ✓ | — | — | — | — | — |
| `tools.view` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `tools.connect` | ✓ | ✓ | — | ✓ | ✓ | — |
| `tools.manage` | ✓ | — | — | ✓ | — | — |
| `visibility.view` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `visibility.manage` | ✓ | — | — | — | — | — |
| `publication.manage` | ✓ | — | — | — | — | — |
| `resources.view` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `resources.manage` | ✓ | — | — | ✓ | — | — |
| `audit.view` | ✓ | — | — | — | — | — |

### 16.1 Role semantics and guardrails

- **Parent administrator:** operationally manages the parent project, members, project-local roles, tools and resources. Cannot transfer ownership, physically delete the project, delete the owner's account, or override hierarchy-level owner authority.
- **Parent manager:** coordinates project work; may update ordinary project information, view members/resources/tools, invite members and connect an already-entitled tool. Cannot remove members, change roles, alter confidentiality/publication, archive or delete.
- **Parent member:** read access to project information, member directory, tools and shared resources where the underlying resource permission allows it.
- **Child leader:** leads the child project; may update/archive that child, manage its members, invite/remove participants, connect/manage child-authorized tools and resources. Cannot create custom roles, transfer ownership, change hierarchy ownership, or make a child public when ancestor rules prohibit it.
- **Child developer:** may update child project information, view members, view/connect entitled tools and view shared resources. Cannot manage members or project visibility.
- **Child observer:** project read access only. No member directory, tool, resource, publication or administrative access by default.

### 16.2 Additional authorization rules

1. The owner and root hierarchy owner receive owner-level authority outside role mappings.
2. `members.manage` does not imply `members.roles.manage`; role assignment is a separate elevated permission.
3. `visibility.manage` and `publication.manage` are deliberately excluded from all default non-owner roles in release one. The owner may delegate them later through an explicit reviewed policy.
4. Custom roles may be created only by the owner or a parent administrator with `roles.create`. Child leaders do not create custom roles in release one.
5. Individual grants cannot grant `roles.*`, ownership transfer, physical deletion, account deletion or any permission marked owner-only.
6. A child leader's `project.archive` applies only to that child; it cannot archive its parent or siblings.
7. Role permissions authorize an action only within the exact project scope and do not imply access to descendants or ancestors.
8. Resource-share permissions are an additional gate. A project role cannot override a resource owner's explicit share denial.
9. The `audit.view` permission is added to the global permission catalogue and is granted only to parent administrators by default. Root owner can always inspect hierarchy audit history.
10. This matrix is the proposed baseline for review; it must be seeded as explicit rows, not implemented as hard-coded conditionals.

---

## 17. Table-by-table RLS and SQL privilege matrix

### 17.1 Schema/API boundary

The `projects` schema is an internal schema and is not added to the PostgREST exposed-schema list in release one.

To make Supabase client RPC calls possible without exposing base tables:

- Expose only the required wrapper functions in the already exposed `public` schema.
- Keep implementation tables and privileged helper functions in `projects`.
- Public wrapper functions have narrow signatures and delegate to internal routines.
- Grant `EXECUTE` on each wrapper only to `authenticated`, except a specifically reviewed public publication endpoint if one is later required.
- Internal routines are not directly exposed through PostgREST.
- The wrapper must not accept an actor UUID; internal logic derives actor from `auth.uid()`.
- Do not grant `USAGE` on the internal schema to `anon`.
- Do not expose `projects` tables through PostgREST.

If Supabase deployment constraints make this wrapper arrangement impossible, stop and revise the exposure design before granting schema-wide access. Do not solve it by exposing all Projects tables.

### 17.2 Table policy matrix

All listed tables have RLS enabled. The matrix describes row visibility and write path. Direct client writes are denied for every table.

| Table | authenticated SELECT policy | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `projects.projects` | Owner/root owner, or active member with `project.view` | RPC only | RPC only | RPC only |
| `project_component_types` | Active catalogue rows to authenticated users | Migration/service only | Migration/service only | Migration/service only |
| `project_memberships` | Own membership row; or project users with `members.view`; owner/root owner | RPC only | RPC only | Never directly; status transition by RPC |
| `project_roles` | System roles; project roles only to users with `members.view` or role-management permission | RPC/migration only | RPC/migration only | RPC/migration only |
| `project_permissions` | Permission catalogue to authenticated users | Migration only | Migration only | Migration only |
| `project_role_permissions` | Mappings for system roles and project roles visible to caller | RPC/migration only | RPC/migration only | RPC/migration only |
| `project_access_grants` | Own grants only; or project owner/root owner and users with `members.roles.manage` | RPC only | RPC only | RPC only |
| `project_invitations` | Invitee sees own invitation; inviter and authorized member managers see invitations for their project; owner/root owner | RPC only | RPC only | RPC only |
| `project_visibility` | Users with `visibility.view`; owner/root owner | RPC only | RPC only | Never directly |
| `project_publications` | Project-authorized users with `publication.manage`; public users receive data only through safe publication endpoint | RPC only | RPC only | RPC only |
| `project_profile_listings` | Project owner/root owner and the profile subject; public profile projection only when listing active and publication is effectively public | RPC only | RPC only | RPC only |
| `project_tool_connections` | Users with `tools.view`; owner/root owner | RPC only | RPC only | RPC only |
| `project_resource_shares` | Authorized users of resource-owner and consumer projects with `resources.view`; owner/root owner | RPC only | RPC only | RPC only |
| `project_resource_permissions` | Users authorized to inspect the corresponding share; owner/root owner | RPC only | RPC only | RPC only |
| `project_ownership_transfers` | Previous owner, new owner, and root owner; no other member | RPC only | RPC only | RPC only |
| `project_audit_logs` | Owner/root owner; otherwise users with `audit.view` | Internal audit routine only | Denied | Denied |

### 17.3 RLS implementation details

- RLS predicates must call narrowly scoped, stable authorization helpers and must avoid recursive policy evaluation.
- Helper functions used in policies must not be exposed as general-purpose client APIs.
- Use `SECURITY DEFINER` only where needed to avoid policy recursion or to inspect protected membership/role rows; each helper must have a fixed search path, fully qualified names and restricted EXECUTE grants.
- Policy helpers must not accept an actor UUID as authority. The actor is `auth.uid()`.
- Policies must be tested as `anon`, two unrelated `authenticated` users, project owner, root hierarchy owner, parent member, child member, and service role.
- RLS is not a replacement for RPC authorization. Every write RPC validates permissions independently before mutation.
- Service-role bypass of RLS is expected; service-role use is server-only and must be audited at application boundaries.
- No policy may use a caller-controlled JWT user metadata field as proof of project ownership. Ownership is read from the Projects table.
- For publication, prefer a narrowly scoped public wrapper that returns only approved publication fields. Do not grant `anon` SELECT on `project_publications` or `projects`.

### 17.4 Required database grants

Target grants, to be translated into explicit migration statements after preflight:

- Revoke all table privileges on `projects.*` from `PUBLIC`, `anon` and `authenticated` by default.
- Grant only catalogue SELECT where needed to `authenticated`, protected by RLS.
- Do not grant direct DML on business tables to `authenticated`.
- Grant EXECUTE on each public RPC wrapper individually to `authenticated`.
- Revoke EXECUTE on internal privileged functions from `PUBLIC`, `anon` and `authenticated` unless the wrapper's execution model specifically requires a narrowly scoped grant.
- Do not grant `USAGE` on the internal `projects` schema to `anon`.
- Do not use blanket `GRANT ALL ON ALL TABLES` or blanket `GRANT EXECUTE ON ALL FUNCTIONS`.

---

## 18. Exact RPC API contracts (release-one target)

All client-facing RPC wrappers live in `public` and use the `project_*` prefix. Internal implementations live in `projects` and are not directly exposed.

Conventions:

- Every mutating RPC derives the actor from `auth.uid()`.
- No RPC accepts `actor_user_id`, `owner_user_id`, `created_by`, or an arbitrary membership user UUID as authority input.
- UUIDs identify target records; they do not prove authorization.
- JSONB is used for bounded DTO input/output only, not as the permission storage model.
- All text inputs are trimmed and length-validated server-side.
- Errors use stable SQLSTATE where practical and safe, non-sensitive messages.
- Mutating operations write audit events in the same transaction.
- All RPCs are transaction-atomic at the PostgreSQL function-call boundary.

### 18.1 Project operations

| Public RPC signature | Return | Contract |
|---|---|---|
| `public.project_create(p_parent_project_id uuid, p_name text, p_description text, p_project_type text, p_component_code text default null) returns jsonb` | Project DTO | Root: owner is `auth.uid()`. Child: parent must be active and caller must be its owner/root owner; child owner is copied from parent. Insert project, private visibility and audit atomically. |
| `public.project_update(p_project_id uuid, p_name text, p_description text) returns jsonb` | Project DTO | Requires `project.update`; only name/description mutable in release one. Parent, owner, creator, type and status cannot be changed through this RPC. |
| `public.project_archive(p_project_id uuid) returns jsonb` | Status DTO | Requires `project.archive` or owner/root owner. Archives exactly one project; no cascade. |
| `public.project_restore(p_project_id uuid) returns jsonb` | Status DTO | Owner/root owner or explicitly authorized `project.archive` policy. Restores only selected row. |
| `public.project_delete(p_project_id uuid, p_confirmation_project_id uuid) returns jsonb` | Deletion receipt | Owner/root owner only. Both UUIDs must match. Reject children and all blocking dependencies; preserve audit. No cascading child deletion. |
| `public.project_access_check(p_project_id uuid, p_permission_code text) returns boolean` | Boolean | Read-only check for current caller; never accepts actor identity. Unknown permission returns false. |

### 18.2 Membership, invitations and roles

| Public RPC signature | Return | Contract |
|---|---|---|
| `public.project_user_lookup(p_username text) returns jsonb` | Minimal user DTO or null | Authenticated only; exact case-insensitive username match; returns UUID, username and approved display name only. Rate-limited. No email/birth date. |
| `public.project_member_invite(p_project_id uuid, p_invitee_username text, p_invitee_email text, p_role_id uuid, p_token_hash text) returns jsonb` | Invitation DTO | Exactly one of username/email required. Username resolves internally to UUID. Email path normalizes and binds invitation to verified email at acceptance. Inviter requires `members.invite`. Token hash only is stored. Email dispatch occurs in trusted server workflow; no membership is created on send. |
| `public.project_invitation_accept(p_token_hash text) returns jsonb` | Membership DTO | Authenticated caller only. Verifies pending state, expiry and invitee binding; for email invitation, verifies current Auth email is confirmed and matches normalized invitee email. Creates/reactivates membership atomically. |
| `public.project_invitation_decline(p_token_hash text) returns jsonb` | Invitation status DTO | Only bound invitee may decline a pending invitation. |
| `public.project_member_remove(p_project_id uuid, p_member_user_id uuid) returns jsonb` | Membership status DTO | Requires `members.remove`; cannot remove owner; cannot leave project without required administrator continuity. |
| `public.project_member_role_update(p_project_id uuid, p_member_user_id uuid, p_role_id uuid) returns jsonb` | Membership DTO | Requires `members.roles.manage`; role scope must match project scope; owner cannot be assigned a membership role. |
| `public.project_role_create(p_project_id uuid, p_code text, p_name text, p_description text, p_permission_codes text[]) returns jsonb` | Role DTO | Owner or parent administrator with `roles.create`; custom role scoped to one project; permissions must be an allowlisted subset of the project's scope. |
| `public.project_role_update(p_role_id uuid, p_name text, p_description text, p_permission_codes text[]) returns jsonb` | Role DTO | Custom role only; owner or authorized parent administrator; cannot edit system role. |
| `public.project_role_delete(p_role_id uuid) returns jsonb` | Result DTO | Custom role only; reject while assigned to any membership or otherwise referenced. |
| `public.project_permission_update(p_project_id uuid, p_user_id uuid, p_permission_code text, p_effect text, p_expires_at timestamptz) returns jsonb` | Grant DTO | Requires `members.roles.manage`; target must have active membership; effect allow/deny; protected owner-only permissions cannot be granted or denied. Null effect is not used to delete; use a dedicated revoke operation. |
| `public.project_permission_revoke(p_project_id uuid, p_user_id uuid, p_permission_code text) returns jsonb` | Result DTO | Requires `members.roles.manage`; removes the current override and audits the previous state. |

### 18.3 Visibility, publication and profile listing

| Public RPC signature | Return | Contract |
|---|---|---|
| `public.project_visibility_update(p_project_id uuid, p_confidentiality text, p_showcase_visibility boolean, p_profile_visibility boolean) returns jsonb` | Visibility DTO | Owner/root owner only in release one. Child cannot become effectively public beneath private/archived ancestor. |
| `public.project_publication_update(p_project_id uuid, p_public_slug text, p_title text, p_public_description text, p_cover_image text, p_status text) returns jsonb` | Publication DTO | Owner/root owner only in release one. Validate slug, fields and safe asset reference. Published state requires effective public availability. |
| `public.project_profile_listing_update(p_project_id uuid, p_profile_user_id uuid, p_position integer, p_status text) returns jsonb` | Listing DTO | Owner/root owner authorizes or hides one profile listing. Does not itself make project public. Profile user UUID is target data, not authority. |
| `public.project_publication_get(p_public_slug text) returns jsonb` | Safe public DTO | If a public page is released, callable by `anon` and `authenticated`; returns only title, public description, cover and explicitly approved public fields. Verifies complete ancestor chain. No base table access. |

### 18.4 Tools/resource references

| Public RPC signature | Return | Contract |
|---|---|---|
| `public.project_resource_share(p_resource_owner_project_id uuid, p_consumer_project_id uuid, p_resource_type text, p_resource_id uuid, p_permission_codes text[]) returns jsonb` | Share DTO | Requires authority over resource-owner project; both projects must belong to same hierarchy; consumer cannot re-share; resource permissions are normalized rows. |
| `public.project_resource_revoke(p_share_id uuid) returns jsonb` | Share status DTO | Resource owner/root owner only; revokes one share and its effective permissions; does not affect other consumers. |
| `public.project_tool_connection_register(p_project_id uuid, p_tool_code text, p_connection_id uuid) returns jsonb` | Connection DTO | Reserved integration contract for later Tools implementation. Must not be deployed until Tools entitlement and connection ownership APIs exist. |
| `public.project_tool_connection_update(p_connection_id uuid, p_status text) returns jsonb` | Connection DTO | Reserved integration contract for later Tools implementation. Must not be deployed until Tools subsystem defines lifecycle and service authentication. |

### 18.5 Ownership transfer and account deletion preflight

| Public RPC signature | Return | Contract |
|---|---|---|
| `public.project_transfer_initiate(p_root_project_id uuid, p_new_owner_username text, p_token_hash text) returns jsonb` | Pending transfer DTO | Current root owner only; resolves registered target by exact username; target account must have confirmed email. Creates pending transfer and sends confirmation through trusted server workflow. |
| `public.project_transfer_confirm(p_token_hash text) returns jsonb` | Transfer receipt | Authenticated new owner only; verifies token and account confirmation; locks and atomically updates entire descendant hierarchy. |
| `public.project_transfer_cancel(p_transfer_id uuid) returns jsonb` | Transfer status DTO | Previous owner/root owner only; pending transfer only. |
| `public.project_account_deletion_preflight(p_user_id uuid) returns jsonb` | Blocker DTO | Service-role/server-only. Returns machine-readable blockers (owned projects, sole-admin memberships, pending transfers/dependencies). Must not be executable by browser roles. Does not delete the Auth user. |

### 18.6 RPC implementation security

- The public wrapper functions must be explicitly granted by function signature, not by schema-wide blanket grants.
- Internal privileged routines must use a fixed `search_path`, fully qualified names, minimal owner privileges and restricted EXECUTE.
- Public wrappers must not permit arbitrary SQL, table names, function names or dynamic column selection.
- Public wrapper parameters must be validated before delegation.
- Invitation and transfer token hashes must be compared using a constant-time comparison where supported by the application/server layer; raw tokens are never persisted.
- Rate limiting must be enforced in a trusted server layer or a dedicated database-backed limiter; client-side throttling is insufficient.
- Email delivery must occur outside the database transaction. Use an outbox or trusted Edge Function workflow with retry/idempotency. A failed email send must not create membership or complete transfer.
- Functions reserved for the future Tools subsystem are documented contracts only and must not be created in the first Projects migration set.

---

## 19. Transaction, concurrency and data-integrity implementation notes

### 19.1 Hierarchy lock strategy

A hierarchy operation must serialize against other hierarchy mutations. Use a deterministic transaction-scoped advisory lock derived from a stable root identifier, and then lock all affected project rows in ascending UUID order.

For a new root project, lock is not needed beyond the insert. For a child create, resolve and lock the current root before validating the parent. For transfer, archive, delete and any future reparent operation, lock the root and all descendants.

The implementation must re-read hierarchy membership after acquiring the lock; a pre-lock recursive query is not authoritative.

### 19.2 Parent/child owner constraint

The composite unique key and composite self-FK are the primary relational guard for parent/child owner equality. The transfer implementation must be tested against PostgreSQL's FK update behavior and constraint checking.

Do not rely solely on a trigger that checks owner equality without appropriate row locking; concurrent changes can race.

### 19.3 Role scope integrity

A membership's role must be either:
- a system role with `project_id IS NULL` and matching `scope`; or
- a custom role whose `project_id` equals the membership's `project_id` and whose scope matches that project.

This is cross-row validation and must be enforced by a constraint trigger or by a single transactional RPC with a database trigger as a final invariant guard. Direct DML remains revoked.

### 19.4 Exactly one invitation target

Add a CHECK constraint requiring exactly one of `invitee_user_id` and `invitee_email` to be non-null. Normalize email before persistence. A unique partial index must prevent duplicate pending invitations for the same project and target.

### 19.5 Audit immutability

Audit insert must be available only to internal routines. Add a trigger that rejects UPDATE and DELETE regardless of client role. Any legal retention/purge exception must be a separately reviewed privileged maintenance operation and must never be callable by normal users.

### 19.6 Publication projection

The public publication function must traverse ancestors and return a minimal DTO. It must not return `project_id`, `owner_user_id`, internal description, visibility internals, membership counts unless deliberately approved, or any member information. The slug is the public lookup key; internal UUID remains private.

### 19.7 Resource share uniqueness and revocation

Define a uniqueness rule for an active share on `(resource_owner_project_id, consumer_project_id, resource_type, resource_id)`. Re-sharing after revocation may either reactivate the existing row or create a new version; release-one recommendation is to reactivate the existing share while preserving audit history. Permission rows are replaced transactionally and old state is audited.

### 19.8 Invitation and transfer outbox

Email sending is an external side effect and cannot be made atomic with PostgreSQL commit. Use an outbox record written in the same transaction as the pending invitation/transfer, then process it asynchronously with idempotent delivery. The current entity list does not yet include a generic outbox table; before implementing email workflows, add a dedicated `project_notification_outbox` table with retry state, attempt count, next-attempt time, provider message ID and safe error metadata. Never put raw invitation/transfer tokens in the outbox; store a protected encrypted payload or use a one-time token handoff design reviewed separately.

---

## 20. Updated implementation status

- Product model: agreed.
- Logical entities and table-level field definitions: drafted.
- Initial role-permission matrix: proposed in Section 16.
- Table-by-table RLS and privilege matrix: drafted in Section 17.
- Public RPC signatures and contracts: drafted in Section 18.
- Transaction/concurrency constraints: expanded in Section 19.
- Executable SQL migrations: **not created**.
- Supabase schema, tables, policies, grants, functions and triggers: **unchanged**.

The next review must focus on Sections 16–19, especially role defaults, the public-wrapper/internal-schema API boundary, and the invitation/transfer outbox design. Once those are accepted, the next technical step is a migration-level PostgreSQL validation plan and executable SQL draft in the development repository. No migration may be applied to Supabase without separate explicit approval.


**Current state:** specification draft expanded to v2.1.0. No database DDL, RLS, grants, functions, triggers, data or migrations have been changed.


---

## 21. Live preflight and implementation corrections

A read-only database preflight was repeated on 2026-11-16.

Observed:
- PostgreSQL server version is 17.11.
- The `projects` schema does not exist.
- No Projects or Tools tables were found in the inspected application schemas.
- `pgcrypto` is already installed in schema `extensions`, version 1.3.
- Existing identity/profile source remains `private.user_profiles`.
- Existing authentication/profile functions remain present and are not to be replaced by Projects migrations.
- The exposed-schema setting was not available through the inspected database setting; verify it in Supabase Dashboard before deployment.

### 21.1 Public RPC wrapper security

The public-wrapper/internal-schema design requires an explicit privilege decision. A public wrapper that must access an unexposed internal schema may need `SECURITY DEFINER`. If so, it is a privileged API endpoint and must check `auth.uid()`, use `SET search_path = ''`, fully qualify all references, revoke default EXECUTE from `PUBLIC` and grant only the exact intended signatures. Do not grant broad schema usage or blanket function execution merely to make PostgREST calls work.

### 21.2 Bearer-token boundary

Invitation and ownership-transfer bearer token creation and delivery must be handled by a trusted server workflow. A client must not be allowed to choose arbitrary token hashes for newly created invitations/transfers. Store only a cryptographic token hash in the database; issue and deliver the raw token through a trusted one-time workflow.

### 21.3 Ownership-transfer membership precondition

The target owner must not have a membership row in any project in the hierarchy being transferred. The release-one transfer operation must reject such a transfer until those memberships are explicitly removed, or atomically remove them with audit events. The recommended baseline is to reject and require membership cleanup first, avoiding implicit role/history changes.

### 21.4 SQL draft scope

The first core SQL draft intentionally enables RLS without client policies or direct table grants. Until the later authorization/RPC migration is complete, the subsystem remains inaccessible to browser roles by default.

**Current state:** specification v2.2.0 and a separate migration validation plan/core SQL draft have been prepared. No database DDL, RLS, grants, functions, triggers, data or migrations have been changed.


---

## 22. Migration draft status

The approved role matrix has been carried into the core SQL seed set, including `audit.view`. A first-phase core schema draft and a separate migration validation plan are stored in the repository:

- `docs/architecture/sql-drafts/projects-001-core-schema.sql`
- `docs/architecture/projects-migration-validation-plan.md`

The SQL draft has not been executed. No PostgreSQL parser or Supabase CLI was available in the current execution environment; syntax and runtime behavior must be validated against a disposable local PostgreSQL 17.11/Supabase stack before the draft is promoted to a real migration. No production database changes have been made.


## 20. Projects RPC security and component normalization (2026-11-16)

- Public functions in the exposed `public` schema are `SECURITY INVOKER` wrappers only. They perform no privilege elevation.
- Privileged implementation functions reside in the unexposed `projects` schema and use `SECURITY DEFINER`, fixed empty `search_path`, qualified object references, and explicit authenticated EXECUTE grants.
- The `projects` schema remains excluded from PostgREST's exposed-schema list. Authenticated receives schema USAGE solely to call the narrowly granted implementation functions; base-table privileges remain revoked.
- `project_create` accepts an array of component codes. Unknown, inactive, duplicate, empty and offline-project component combinations are rejected. Zero components remains valid.
- `projects.project_components` is the authoritative normalized relation. Existing scalar component IDs are backfilled; the scalar column is deprecated and not written by the RPC.
