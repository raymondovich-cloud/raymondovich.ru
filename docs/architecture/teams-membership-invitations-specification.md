# Teams — Membership and Invitations Specification

**Version:** 1.1.0  
**Status:** B2 database migration applied to development Supabase as 20261124083432; frontend not implemented  
**Created:** 2026-11-24  
**Updated:** 2026-11-24  
**Parent:** [Teams Backend Architecture Specification](./teams-backend-specification.md)

## 1. Scope

This document defines the next Team capability set: private member listing, invitations to existing Raymondovich accounts by exact username, recipient acceptance/decline, invitation cancellation, fixed-role administration, suspension, reinstatement and removal.

This is an architecture contract only. It does not modify Supabase, frontend code, production resources, or existing Projects permissions. Each implementation subphase requires a separately reviewed migration and explicit approval.

Included:
- List Team members with privacy-minimized identity fields.
- Resolve an existing account by exact username; no public user directory.
- Create/list/cancel pending invitations.
- Recipient-only accept/decline.
- Fixed-role changes and member lifecycle management.
- Append-only audit for every mutation.

Excluded: email/phone invitations, non-registered invitees, public user search, custom roles, ownership transfer, Team chat/tasks/files, billing, bulk invitations, external bearer links, and Team–Project linking.

## 2. Invariants

1. Teams remain private. Only active Team members can read membership; invitation lists have narrower role access.
2. All relationships use `auth.users.id` UUIDs. Username is lookup/display input only.
3. Actor identity is derived from `auth.uid()`; no RPC accepts an actor UUID as an authorization input.
4. Team membership never grants Project membership, role, grant, visibility, or access.
5. Suspended and removed members have no Team access.
6. Exactly one active owner membership exists. Owner cannot be suspended, removed, or role-edited in this phase.
7. Invitation acceptance and membership insert/reactivation are one transaction.
8. Every mutation writes audit in the same transaction; audit failure rolls back the mutation.
9. At most one pending invitation exists per Team and invitee.
10. No endpoint returns email, birth date, phone, auth metadata, credentials, or unrelated profile fields.

## 3. Role and authority matrix

Fixed roles: `owner`, `admin`, `manager`, `member`.

| Operation | owner | admin | manager | member |
| --- | --- | --- | --- | --- |
| Read member list | Yes | Yes | Yes | Yes |
| Invite member | Yes | Yes | Yes, member role only | No |
| Invite manager | Yes | Yes | No | No |
| Invite admin | Yes | No | No | No |
| View pending Team invitations | Yes | Yes | Yes | No |
| Cancel own invitation | Yes | Yes | Yes | No |
| Cancel any Team invitation | Yes | Yes | No | No |
| Accept/decline invitation addressed to self | Recipient only | Recipient only | Recipient only | Recipient only |
| Change roles | Yes | Limited | No | No |
| Suspend/reinstate/remove | Yes | Limited | No | No |
| Modify owner membership | Not available | No | No | No |

### 3.1 Role changes

- Only owner can assign or revoke `admin`.
- Owner and admin can assign `manager` or `member`.
- Admin cannot modify another admin, owner, or their own role.
- Manager can invite only as `member`; manager cannot modify membership roles/status.
- No operation can create a second owner.
- Actor and target membership state must be revalidated inside the same transaction as the mutation.

### 3.2 Suspension and removal

- Owner can suspend, reinstate, or remove any non-owner member.
- Admin can suspend, reinstate, or remove managers and members only.
- Admin cannot modify owner/admin or self.
- Manager/member cannot change another member's status.
- Owner cannot be suspended or removed. Ownership transfer is a separate future design.
- Membership history must not be physically deleted by client RPC.

**Schema decision required:** current `teams.memberships` status constraint supports `active` and `suspended`; it has a unique `(team_id,user_id)` constraint. The implementation must add a reviewed `removed` state or equivalent historical lifecycle. Recommended first-release approach: add `removed` status and reactivate the same membership row after a later accepted invitation, preserving audit history. Reinstatement applies only to `suspended`, not `removed`.

## 4. Invitation lifecycle

### 4.1 Target resolution

Inviter submits an exact Raymondovich username. Server normalizes it using the canonical account policy and resolves one existing account. Reject self-invitation. Check Team authorization before resolving the username, and return privacy-safe errors so unauthorized callers cannot enumerate accounts.

**Verified against the live development schema:** canonical username is `private.user_profiles.username`; values are lowercase and match `^[a-z0-9][a-z0-9._-]{2,23}# Teams — Membership and Invitations Specification

**Version:** 1.1.0  
**Status:** B2 database migration drafted in development repository; not applied to Supabase; frontend not implemented  
**Created:** 2026-11-24  
**Updated:** 2026-11-24  
**Parent:** [Teams Backend Architecture Specification](./teams-backend-specification.md)

## 1. Scope

This document defines the next Team capability set: private member listing, invitations to existing Raymondovich accounts by exact username, recipient acceptance/decline, invitation cancellation, fixed-role administration, suspension, reinstatement and removal.

This is an architecture contract only. It does not modify Supabase, frontend code, production resources, or existing Projects permissions. Each implementation subphase requires a separately reviewed migration and explicit approval.

Included:
- List Team members with privacy-minimized identity fields.
- Resolve an existing account by exact username; no public user directory.
- Create/list/cancel pending invitations.
- Recipient-only accept/decline.
- Fixed-role changes and member lifecycle management.
- Append-only audit for every mutation.

Excluded: email/phone invitations, non-registered invitees, public user search, custom roles, ownership transfer, Team chat/tasks/files, billing, bulk invitations, external bearer links, and Team–Project linking.

## 2. Invariants

1. Teams remain private. Only active Team members can read membership; invitation lists have narrower role access.
2. All relationships use `auth.users.id` UUIDs. Username is lookup/display input only.
3. Actor identity is derived from `auth.uid()`; no RPC accepts an actor UUID as an authorization input.
4. Team membership never grants Project membership, role, grant, visibility, or access.
5. Suspended and removed members have no Team access.
6. Exactly one active owner membership exists. Owner cannot be suspended, removed, or role-edited in this phase.
7. Invitation acceptance and membership insert/reactivation are one transaction.
8. Every mutation writes audit in the same transaction; audit failure rolls back the mutation.
9. At most one pending invitation exists per Team and invitee.
10. No endpoint returns email, birth date, phone, auth metadata, credentials, or unrelated profile fields.

## 3. Role and authority matrix

Fixed roles: `owner`, `admin`, `manager`, `member`.

| Operation | owner | admin | manager | member |
| --- | --- | --- | --- | --- |
| Read member list | Yes | Yes | Yes | Yes |
| Invite member | Yes | Yes | Yes, member role only | No |
| Invite manager | Yes | Yes | No | No |
| Invite admin | Yes | No | No | No |
| View pending Team invitations | Yes | Yes | Yes | No |
| Cancel own invitation | Yes | Yes | Yes | No |
| Cancel any Team invitation | Yes | Yes | No | No |
| Accept/decline invitation addressed to self | Recipient only | Recipient only | Recipient only | Recipient only |
| Change roles | Yes | Limited | No | No |
| Suspend/reinstate/remove | Yes | Limited | No | No |
| Modify owner membership | Not available | No | No | No |

### 3.1 Role changes

- Only owner can assign or revoke `admin`.
- Owner and admin can assign `manager` or `member`.
- Admin cannot modify another admin, owner, or their own role.
- Manager can invite only as `member`; manager cannot modify membership roles/status.
- No operation can create a second owner.
- Actor and target membership state must be revalidated inside the same transaction as the mutation.

### 3.2 Suspension and removal

- Owner can suspend, reinstate, or remove any non-owner member.
- Admin can suspend, reinstate, or remove managers and members only.
- Admin cannot modify owner/admin or self.
- Manager/member cannot change another member's status.
- Owner cannot be suspended or removed. Ownership transfer is a separate future design.
- Membership history must not be physically deleted by client RPC.

**Schema decision required:** current `teams.memberships` status constraint supports `active` and `suspended`; it has a unique `(team_id,user_id)` constraint. The implementation must add a reviewed `removed` state or equivalent historical lifecycle. Recommended first-release approach: add `removed` status and reactivate the same membership row after a later accepted invitation, preserving audit history. Reinstatement applies only to `suspended`, not `removed`.

## 4. Invitation lifecycle

### 4.1 Target resolution

Inviter submits an exact Raymondovich username. Server normalizes it using the canonical account policy and resolves one existing account. Reject self-invitation. Check Team authorization before resolving the username, and return privacy-safe errors so unauthorized callers cannot enumerate accounts.

; uniqueness is enforced by a unique index on `lower(username)`. The inviter/invitee label is username only. Full name, email, birth date and auth metadata are not returned.

### 4.2 Logical invitation record

| Field | Type | Rule |
| --- | --- | --- |
| id | uuid | Server-generated |
| team_id | uuid | Team FK |
| invitee_user_id | uuid | Existing auth UUID |
| invited_by_user_id | uuid | Actor UUID |
| requested_role | text | admin/manager/member; never owner |
| status | text | pending/accepted/declined/cancelled/expired |
| created_at | timestamptz | Server timestamp |
| expires_at | timestamptz | Server timestamp + 7 days |
| responded_at | timestamptz | Nullable |
| cancelled_at | timestamptz | Nullable |

No raw secret or bearer token is stored. Invitation is account-bound; only the authenticated invitee can respond.

### 4.3 State transitions

Allowed: pending → accepted, declined, cancelled, expired. Terminal states cannot be changed. Expiry is checked server-side using database time. Replayed responses return a stable already-processed conflict and do not mutate state.

### 4.4 Duplicates and abuse controls

- Enforce one pending invitation per Team/invitee with a database uniqueness strategy; a client pre-check is insufficient.
- Initial expiry: 7 days.
- Resend replaces the prior pending invitation atomically, recording an explicit replacement audit event.
- Initial server-side limits: at most 10 invitations per actor per rolling hour, 30 per actor per rolling 24 hours, and 10 invitations received per account per rolling 24 hours. Counts include all invitation outcomes so cancellation cannot reset limits.
- Same Team + recipient resend cooldown: 60 seconds. A later resend atomically cancels/replaces the previous pending invitation and writes an audit event.
- Rate checks are serialized with transaction-scoped advisory locks on actor and recipient IDs. These are initial platform defaults and should be revisited using abuse telemetry.
- Do not reveal account existence to callers without invitation permission.

## 5. Proposed RPC contracts

Names are proposed and must be checked against database naming conventions before migration.

### Read
- `team_members_list(p_team_id uuid)`: active Team member only. Return membership ID only where needed for administration, user UUID only where needed for role/removal actions, safe username/display label, role, status, joined_at. Do not return unrelated profile fields.
- `team_invitations_list(p_team_id uuid)`: owner/admin/manager only. Return invitation ID, minimal invitee label, requested role, inviter label, created_at, expires_at.
- Recipient invitation inbox is not a separate Team RPC or page. Invitations are delivered through the shared notification center; the notification payload contains only invitation ID, Team ID/name, inviter username, requested role, optional message and expiry.

### Mutations
- `team_invite(p_team_id uuid, p_username text, p_role text default 'member', p_message text default null)`
- `team_invitation_accept(p_invitation_id uuid)`
- `team_invitation_decline(p_invitation_id uuid)`
- `team_invitation_cancel(p_invitation_id uuid)`
- `team_member_role_set(p_team_id uuid, p_user_id uuid, p_role text)`
- `team_member_suspend(p_team_id uuid, p_user_id uuid)`
- `team_member_reinstate(p_team_id uuid, p_user_id uuid)`
- `team_member_remove(p_team_id uuid, p_user_id uuid)`

All mutations require authentication, derive actor from `auth.uid()`, lock relevant rows in consistent order, validate Team and membership state, enforce the role matrix, perform one atomic transition, append audit, and return minimal data.

### 5.1 Acceptance transaction

1. Lock invitation row.
2. Verify invitee UUID equals `auth.uid()`.
3. Verify pending status and `expires_at > now()`.
4. Verify Team remains active.
5. Inspect existing membership:
   - no row: insert active membership with requested role;
   - suspended row: reject; administrator must reinstate explicitly;
   - removed row: reactivate same row with requested role and new joined timestamp;
   - already active row: return conflict and leave invitation unchanged.
6. Mark invitation accepted and set response timestamp.
7. Write `team.invitation.accepted` and `team.member.joined` or `team.member.reactivated` audit event(s).
8. Commit atomically; any failure rolls back all changes.

## 6. Audit event catalogue

- `team.invitation.created`
- `team.invitation.replaced`
- `team.invitation.accepted`
- `team.invitation.declined`
- `team.invitation.cancelled`
- `team.member.role_changed`
- `team.member.suspended`
- `team.member.reinstated`
- `team.member.removed`
- `team.member.joined`
- `team.member.reactivated`

Metadata must remain minimal: identifiers required for traceability and old/new role/status. Never store email, profile snapshots, secrets, credentials, or tokens.

## 7. Security and database requirements

- Keep `teams` and `notifications` non-exposed; no direct base-table access for anon/authenticated.
- Expose only narrow public RPC wrappers, preferably SECURITY INVOKER; isolate privileged internals in `teams`.
- Any SECURITY DEFINER function requires fixed empty search_path, schema-qualified objects, explicit auth checks, and least privilege.
- Never trust `raw_user_meta_data` for authorization.
- Do not accept actor/inviter/invitee UUID or role/status as trusted authorization claims. Invitee is resolved server-side; actor is `auth.uid()`.
- Enforce role/status allow-lists and pending-invitation uniqueness in the database.
- Notification records are recipient-scoped; only narrow RPCs can list them or mark them read. Notification payload is informational, never an authorization grant.
- Accept/decline RPCs validate the invitation UUID against `auth.uid()`; no recipient UUID is accepted from the client.
- Audit remains append-only.
- Use row locks for acceptance, role changes, and membership status transitions.
- Verify RLS, grants, function security mode, search_path, and schema exposure after migration.
- Run Supabase security advisors and targeted concurrency/authorization SQL tests before release.

## 8. Frontend behavior

Team detail should gain:
- **Участники** — members, role badges, status and actions available to the current role.
- **Приглашения** — visible to owner/admin/manager; username form, optional accompanying message, pending list and cancellation.

The recipient experience belongs to the ecosystem-wide notification center, opened from the existing bell in the workspace header. No separate “Мои приглашения” page is created. A notification card shows the inviter username, Team name, accompanying message, requested role and expiry, with **Принять** / **Отклонить** actions while the invitation remains pending. After a successful response the notification is marked resolved/read and the UI refreshes its unread count. The same notification center will later host other ecosystem event types.

UI hides unavailable actions for clarity but is never the security boundary. Recipient sees Team name, inviter label, requested role and expiry; accept/decline are explicit. After acceptance refresh Team list/detail and members. Show loading, empty, expired, pending, success, permission-denied and retryable states. Never imply Team membership grants Project access.

## 9. Acceptance/security tests

### Invitations
- Non-member cannot create/list Team invitations.
- Member cannot invite.
- Manager invites member role only.
- Admin cannot invite admin.
- Owner can invite all non-owner roles.
- Self-invite denied.
- Unknown username response is privacy-safe.
- Concurrent duplicate pending invites cannot both succeed.
- Expired invite cannot be accepted.
- Only addressed account can accept/decline.
- Terminal invitation cannot be replayed.
- Acceptance/membership update is atomic.
- No second owner can be created.

### Membership
- Member/manager cannot modify membership roles or status.
- Admin cannot alter owner/admin or self.
- Only owner can assign/revoke admin.
- Owner cannot be suspended, removed or role-edited.
- Suspended/removed users cannot read Team.
- Reinstatement applies only to suspended membership.
- All mutations audit and roll back if audit fails.

### Isolation
- No Projects memberships, roles, grants, visibility or access are changed.
- No private profile fields are returned.
- Direct table access denied.
- anon cannot execute protected RPCs.
- SECURITY DEFINER internals have fixed search_path and explicit auth checks.

## 10. Implementation sequence

**B1 — Read-only member view**
1. Verify username/display fields and safe access path in `private.user_profiles`.
2. Add member-list internal function and authenticated wrapper.
3. Add least-privilege grants and SQL security tests.
4. Add Team detail member-list UI.

**B2 — Invitations and notification center**
1. Add account-bound invitation table, generic notification inbox table, indexes and constraints.
2. Implement exact username resolution, create/list/cancel and audit events.
3. Implement recipient-only accept/decline transaction and notification resolution.
4. Enforce the initial server-side rate limits and resend cooldown; test concurrency and authorization.
5. Build the shared bell/notification center UI and Team invitation actions.

**B3 — Membership administration**
1. Add reviewed membership lifecycle and constraints.
2. Implement role changes, suspend/reinstate/remove.
3. Add role-aware UI controls and audit visibility.
4. Run full authorization matrix.

## 11. Decisions resolved for B2

1. Canonical username: `private.user_profiles.username`, lowercase, 3–24 characters, unique case-insensitively.
2. Safe display label: username only. Do not expose full name or private profile fields in Team invitations or notifications.
3. Suspended invitee cannot accept; an administrator must reinstate membership separately.
4. Existing active membership causes a conflict; no duplicate membership is created.
5. Initial rate limits: 10 sent/hour, 30 sent/24 hours, 10 received/24 hours; same Team+recipient resend cooldown 60 seconds.
6. Invitation notifications appear in the global notification center opened by the workspace header bell. No separate “Мои приглашения” page.

The B2 SQL draft is in `docs/architecture/sql-drafts/teams-004-invitations-notifications.sql`. It has not been applied. Database application requires a separate explicit approval after review and validation.

No implementation should guess unresolved schema or policy details.
