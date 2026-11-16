-- Raymondovich Projects: core schema draft
-- Version: 0.3.0
-- Created: 2026-11-16
-- Status: Applied to primary Supabase project on 2026-11-16; post-apply checks passed
-- Target: Supabase PostgreSQL 17.11
-- Canonical migration: supabase/migrations/20261116060455_projects_001_core_schema.sql

begin;

create schema if not exists projects;
revoke all on schema projects from public, anon, authenticated;

create table projects.project_component_types (
  id uuid primary key default gen_random_uuid(),
  code varchar(60) not null unique,
  name varchar(100) not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_component_types_code_format check (code ~ '^[a-z][a-z0-9_]{1,59}$'),
  constraint project_component_types_name_nonempty check (char_length(btrim(name)) between 1 and 100)
);

create table projects.project_permissions (
  id uuid primary key default gen_random_uuid(),
  code varchar(100) not null unique,
  name varchar(120) not null,
  description text,
  created_at timestamptz not null default now(),
  constraint project_permissions_code_format check (code ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint project_permissions_name_nonempty check (char_length(btrim(name)) between 1 and 120)
);

create table projects.projects (
  id uuid primary key default gen_random_uuid(),
  parent_project_id uuid,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  name varchar(120) not null,
  description text,
  project_type text not null,
  component_type_id uuid references projects.project_component_types(id) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete restrict,
  constraint projects_name_nonempty check (char_length(btrim(name)) between 1 and 120),
  constraint projects_description_length check (description is null or char_length(description) <= 20000),
  constraint projects_type_check check (project_type in ('online', 'offline')),
  constraint projects_status_check check (status in ('active', 'archived')),
  constraint projects_not_own_parent check (parent_project_id is null or parent_project_id <> id),
  constraint projects_archive_state_consistency check (
    (status = 'active' and archived_at is null and archived_by is null)
    or (status = 'archived' and archived_at is not null)
  ),
  constraint projects_id_owner_unique unique (id, owner_user_id),
  constraint projects_parent_owner_fk
    foreign key (parent_project_id, owner_user_id)
    references projects.projects(id, owner_user_id)
    on update cascade on delete restrict
    deferrable initially immediate
);

create index projects_parent_project_id_idx on projects.projects(parent_project_id);
create index projects_owner_user_id_idx on projects.projects(owner_user_id);
create index projects_created_by_idx on projects.projects(created_by);
create index projects_status_idx on projects.projects(status);
create index projects_active_owner_created_idx
  on projects.projects(owner_user_id, created_at desc) where status = 'active';

create table projects.project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects.projects(id) on delete restrict,
  scope text not null,
  code varchar(60) not null,
  name varchar(100) not null,
  description text,
  is_system boolean not null default false,
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_roles_scope_check check (scope in ('parent', 'child')),
  constraint project_roles_code_format check (code ~ '^[a-z][a-z0-9_]{1,59}$'),
  constraint project_roles_name_nonempty check (char_length(btrim(name)) between 1 and 100),
  constraint project_roles_system_scope_consistency check (
    (is_system and project_id is null and created_by is null)
    or (not is_system and project_id is not null and created_by is not null)
  )
);

create unique index project_roles_system_scope_code_uidx
  on projects.project_roles(scope, code) where is_system;
create unique index project_roles_custom_project_code_uidx
  on projects.project_roles(project_id, code) where not is_system;
create index project_roles_project_id_idx on projects.project_roles(project_id);

create table projects.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects.projects(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role_id uuid not null references projects.project_roles(id) on delete restrict,
  status text not null default 'active',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_memberships_project_user_unique unique (project_id, user_id),
  constraint project_memberships_status_check check (status in ('active', 'suspended', 'removed'))
);

create index project_memberships_user_status_idx on projects.project_memberships(user_id, status);
create index project_memberships_project_status_idx on projects.project_memberships(project_id, status);

create table projects.project_role_permissions (
  role_id uuid not null references projects.project_roles(id) on delete restrict,
  permission_id uuid not null references projects.project_permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table projects.project_access_grants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects.projects(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  permission_id uuid not null references projects.project_permissions(id) on delete restrict,
  effect text not null,
  granted_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_access_grants_effect_check check (effect in ('allow', 'deny')),
  constraint project_access_grants_project_user_permission_unique unique (project_id, user_id, permission_id)
);

create index project_access_grants_user_expiry_idx on projects.project_access_grants(user_id, expires_at);

create table projects.project_visibility (
  project_id uuid primary key references projects.projects(id) on delete restrict,
  confidentiality text not null default 'private',
  showcase_visibility boolean not null default false,
  profile_visibility boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint project_visibility_confidentiality_check check (confidentiality in ('private', 'public'))
);

-- Cross-row integrity guard: role scope must match the target project's scope.
-- Authorization still belongs in the RPC layer; this trigger only protects data invariants.
create or replace function projects.enforce_membership_role_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role_scope text;
  v_role_project_id uuid;
  v_role_is_system boolean;
  v_project_is_parent boolean;
  v_project_owner_id uuid;
begin
  select r.scope, r.project_id, r.is_system
    into v_role_scope, v_role_project_id, v_role_is_system
  from projects.project_roles as r
  where r.id = new.role_id;

  if not found then
    raise exception using errcode = '23503', message = 'Project role does not exist';
  end if;

  select (p.parent_project_id is null), p.owner_user_id
    into v_project_is_parent, v_project_owner_id
  from projects.projects as p
  where p.id = new.project_id;

  if not found then
    raise exception using errcode = '23503', message = 'Project does not exist';
  end if;

  if (v_project_is_parent and v_role_scope <> 'parent')
     or (not v_project_is_parent and v_role_scope <> 'child') then
    raise exception using errcode = '23514', message = 'Project role scope does not match project scope';
  end if;

  if v_role_is_system and v_role_project_id is not null then
    raise exception using errcode = '23514', message = 'System role cannot be project-bound';
  end if;

  if not v_role_is_system and v_role_project_id is distinct from new.project_id then
    raise exception using errcode = '23514', message = 'Custom role belongs to another project';
  end if;

  if new.user_id = v_project_owner_id then
    raise exception using errcode = '23514', message = 'Project owner cannot have a membership row';
  end if;

  return new;
end;
$function$;

revoke all on function projects.enforce_membership_role_scope() from public, anon, authenticated;

create trigger project_memberships_role_scope_guard
before insert or update of project_id, user_id, role_id
on projects.project_memberships
for each row execute function projects.enforce_membership_role_scope();

insert into projects.project_component_types(code, name, sort_order)
values
  ('website', 'Website', 10),
  ('telegram_mini_app', 'Telegram Mini App', 20),
  ('telegram_bot', 'Telegram Bot', 30),
  ('ios_app', 'iOS App', 40)
on conflict (code) do nothing;

insert into projects.project_permissions(code, name)
values
  ('project.view', 'View project'),
  ('project.update', 'Update project'),
  ('project.archive', 'Archive or restore project'),
  ('members.view', 'View project members'),
  ('members.invite', 'Invite project members'),
  ('members.remove', 'Remove project members'),
  ('members.manage', 'Manage project members'),
  ('members.roles.manage', 'Manage member role assignments'),
  ('roles.create', 'Create custom roles'),
  ('roles.update', 'Update custom roles'),
  ('roles.delete', 'Delete custom roles'),
  ('tools.view', 'View connected tools'),
  ('tools.connect', 'Connect entitled tools'),
  ('tools.manage', 'Manage project tool connections'),
  ('visibility.view', 'View visibility settings'),
  ('visibility.manage', 'Manage visibility settings'),
  ('publication.manage', 'Manage public publication'),
  ('resources.view', 'View shared resources'),
  ('resources.manage', 'Manage resource shares'),
  ('audit.view', 'View project audit history')
on conflict (code) do nothing;

insert into projects.project_roles(scope, code, name, is_system)
values
  ('parent', 'administrator', 'Administrator', true),
  ('parent', 'manager', 'Manager', true),
  ('parent', 'member', 'Member', true),
  ('child', 'leader', 'Leader', true),
  ('child', 'developer', 'Developer', true),
  ('child', 'observer', 'Observer', true)
on conflict do nothing;

with role_permissions(scope, role_code, permission_code) as (
  values
    ('parent','administrator','project.view'),
    ('parent','administrator','project.update'),
    ('parent','administrator','project.archive'),
    ('parent','administrator','members.view'),
    ('parent','administrator','members.invite'),
    ('parent','administrator','members.remove'),
    ('parent','administrator','members.manage'),
    ('parent','administrator','members.roles.manage'),
    ('parent','administrator','roles.create'),
    ('parent','administrator','roles.update'),
    ('parent','administrator','roles.delete'),
    ('parent','administrator','tools.view'),
    ('parent','administrator','tools.connect'),
    ('parent','administrator','tools.manage'),
    ('parent','administrator','visibility.view'),
    ('parent','administrator','visibility.manage'),
    ('parent','administrator','publication.manage'),
    ('parent','administrator','resources.view'),
    ('parent','administrator','resources.manage'),
    ('parent','administrator','audit.view'),
    ('parent','manager','project.view'),
    ('parent','manager','project.update'),
    ('parent','manager','members.view'),
    ('parent','manager','members.invite'),
    ('parent','manager','tools.view'),
    ('parent','manager','tools.connect'),
    ('parent','manager','visibility.view'),
    ('parent','manager','resources.view'),
    ('parent','member','project.view'),
    ('parent','member','members.view'),
    ('parent','member','tools.view'),
    ('parent','member','visibility.view'),
    ('parent','member','resources.view'),
    ('child','leader','project.view'),
    ('child','leader','project.update'),
    ('child','leader','project.archive'),
    ('child','leader','members.view'),
    ('child','leader','members.invite'),
    ('child','leader','members.remove'),
    ('child','leader','members.manage'),
    ('child','leader','tools.view'),
    ('child','leader','tools.connect'),
    ('child','leader','tools.manage'),
    ('child','leader','visibility.view'),
    ('child','leader','resources.view'),
    ('child','leader','resources.manage'),
    ('child','developer','project.view'),
    ('child','developer','project.update'),
    ('child','developer','members.view'),
    ('child','developer','tools.view'),
    ('child','developer','tools.connect'),
    ('child','developer','visibility.view'),
    ('child','developer','resources.view'),
    ('child','observer','project.view')
)
insert into projects.project_role_permissions(role_id, permission_id)
select r.id, p.id
from role_permissions rp
join projects.project_roles r
  on r.scope = rp.scope and r.code = rp.role_code and r.is_system
join projects.project_permissions p
  on p.code = rp.permission_code
on conflict (role_id, permission_id) do nothing;

-- RLS is enabled immediately. No policies or browser-role grants are added in
-- this phase, so client access remains default-deny until later reviewed phases.
alter table projects.project_component_types enable row level security;
alter table projects.project_permissions enable row level security;
alter table projects.projects enable row level security;
alter table projects.project_roles enable row level security;
alter table projects.project_memberships enable row level security;
alter table projects.project_role_permissions enable row level security;
alter table projects.project_access_grants enable row level security;
alter table projects.project_visibility enable row level security;

revoke all on all tables in schema projects from public, anon, authenticated;
revoke all on all sequences in schema projects from public, anon, authenticated;
alter default privileges in schema projects
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema projects
  revoke execute on functions from public, anon, authenticated;

commit;

-- Post-apply checks completed in the primary Supabase project:
-- 1. Confirm all eight tables exist and relrowsecurity = true.
-- 2. Confirm anon/authenticated have no direct table privileges.
-- 3. Confirm six system roles, 20 permissions and the approved mapping counts.
-- 4. Verify composite FK rejects mismatched child owners.
-- 5. Verify trigger rejects wrong-scope/custom-role mismatch and owner membership.
-- 6. Verify parent deletion is restricted while children exist.
-- 7. Verify deleting referenced Auth users is blocked by ON DELETE RESTRICT.
-- 8. Transfer tests must reject a new owner who is already a member of any tree node.
