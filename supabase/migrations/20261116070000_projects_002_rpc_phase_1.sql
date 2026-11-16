-- Raymondovich Projects RPC layer, phase 1
-- Version: 1.2.0
-- Created: 2026-11-16
-- Target: Supabase PostgreSQL 17.11
-- Scope: project_create, project_update, project_archive, project_restore, project_access_check
-- Internal SECURITY DEFINER implementations stay in unexposed schema projects; public PostgREST wrappers are SECURITY INVOKER.

begin;

-- Normalize project-to-component relations. Keep the legacy scalar column during
-- transition; it is no longer written by this RPC and can be removed later.
create table projects.project_components (
  project_id uuid not null references projects.projects(id) on delete restrict,
  component_type_id uuid not null references projects.project_component_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, component_type_id)
);

create index project_components_component_type_idx
  on projects.project_components(component_type_id);

insert into projects.project_components(project_id, component_type_id)
select p.id, p.component_type_id
from projects.projects p
where p.component_type_id is not null
on conflict do nothing;

alter table projects.project_components enable row level security;
revoke all on projects.project_components from public, anon, authenticated;

create table projects.project_audit_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects.projects(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_code varchar(100) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_audit_logs_event_code_format
    check (event_code ~ '^[a-z][a-z0-9_]*[.][a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)*$'),
  constraint project_audit_logs_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index project_audit_logs_project_created_idx
  on projects.project_audit_logs(project_id, created_at desc);
create index project_audit_logs_actor_created_idx
  on projects.project_audit_logs(actor_user_id, created_at desc);

create or replace function projects.reject_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'Project audit records are immutable';
end;
$function$;

revoke all on function projects.reject_audit_mutation() from public, anon, authenticated;

create trigger project_audit_logs_immutable
before update or delete on projects.project_audit_logs
for each row execute function projects.reject_audit_mutation();

-- Serialize operations within one project hierarchy. The root advisory lock
-- prevents concurrent hierarchy operations from observing stale ancestry.
create or replace function projects.lock_hierarchy(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_root_id uuid;
begin
  with recursive ancestors(id, parent_project_id) as (
    select p.id, p.parent_project_id
    from projects.projects p
    where p.id = p_project_id
    union all
    select parent.id, parent.parent_project_id
    from projects.projects parent
    join ancestors child on child.parent_project_id = parent.id
  )
  select a.id into v_root_id
  from ancestors a
  where a.parent_project_id is null
  limit 1;

  if v_root_id is null then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_root_id::text, 78123041)
  );

  -- Lock the hierarchy in deterministic UUID order after acquiring root lock.
  perform p.id
  from projects.projects p
  where p.id in (
    with recursive tree(id) as (
      select v_root_id
      union all
      select child.id
      from projects.projects child
      join tree parent on child.parent_project_id = parent.id
    )
    select id from tree
  )
  order by p.id
  for update;

  return v_root_id;
end;
$function$;

revoke all on function projects.lock_hierarchy(uuid) from public, anon, authenticated;

create or replace function projects.has_permission(
  p_project_id uuid,
  p_permission_code text,
  p_allow_archived_archive boolean default true
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_permission_id uuid;
  v_role_allowed boolean := false;
  v_grant_effect text;
begin
  if v_actor is null or p_project_id is null or p_permission_code is null then
    return false;
  end if;

  select p.owner_user_id, p.status
    into v_owner, v_status
  from projects.projects p
  where p.id = p_project_id;

  if not found then
    return false;
  end if;

  select pp.id into v_permission_id
  from projects.project_permissions pp
  where pp.code = p_permission_code;

  if v_permission_id is null then
    return false;
  end if;

  -- Owner authority is independent of membership roles and individual denies.
  if v_owner = v_actor then
    return true;
  end if;

  if v_status <> 'active'
     and not (p_allow_archived_archive and p_permission_code = 'project.archive') then
    return false;
  end if;

  -- A system child role assigned at an ancestor project applies to its
  -- descendants. Custom roles and parent-scope roles do not inherit.
  with recursive ancestors(id, parent_project_id, depth) as (
    select p.id, p.parent_project_id, 0
    from projects.projects p
    where p.id = p_project_id
    union all
    select parent.id, parent.parent_project_id, child.depth + 1
    from projects.projects parent
    join ancestors child on child.parent_project_id = parent.id
  )
  select exists (
    select 1
    from ancestors a
    join projects.project_memberships m on m.project_id = a.id
    join projects.project_roles r on r.id = m.role_id
    join projects.project_role_permissions rp on rp.role_id = m.role_id
    where m.user_id = v_actor
      and m.status = 'active'
      and rp.permission_id = v_permission_id
      and (
        a.depth = 0
        or (a.depth > 0 and r.scope = 'child' and r.is_system)
      )
  ) into v_role_allowed;

  select g.effect into v_grant_effect
  from projects.project_access_grants g
  where g.project_id = p_project_id
    and g.user_id = v_actor
    and g.permission_id = v_permission_id
    and (g.expires_at is null or g.expires_at > now())
  limit 1;

  if v_grant_effect = 'deny' then
    return false;
  end if;

  if v_grant_effect = 'allow' then
    return exists (
      select 1 from projects.project_memberships m
      where m.project_id = p_project_id
        and m.user_id = v_actor
        and m.status = 'active'
    );
  end if;

  return v_role_allowed;
end;
$function$;

revoke all on function projects.has_permission(uuid, text, boolean) from public, anon, authenticated;

create or replace function projects.project_create_internal(
  p_parent_project_id uuid,
  p_name text,
  p_description text,
  p_project_type text,
  p_component_codes text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_parent_status text;
  v_component_count integer;
  v_component_codes text[] := coalesce(p_component_codes, '{}'::text[]);
  v_project projects.projects%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Project name must contain 1 to 120 characters';
  end if;
  if p_description is not null and char_length(p_description) > 20000 then
    raise exception using errcode = '22023', message = 'Project description is too long';
  end if;
  if p_project_type not in ('online', 'offline') then
    raise exception using errcode = '22023', message = 'Unsupported project type';
  end if;
  if cardinality(v_component_codes) > 0 and p_project_type <> 'online' then
    raise exception using errcode = '22023', message = 'Offline projects cannot declare online components';
  end if;
  if exists (
    select 1 from unnest(v_component_codes) as input(code)
    where input.code is null or char_length(input.code) = 0
  ) then
    raise exception using errcode = '22023', message = 'Component codes must be non-empty';
  end if;
  if cardinality(v_component_codes) <> (
    select count(distinct input.code)::integer
    from unnest(v_component_codes) as input(code)
  ) then
    raise exception using errcode = '22023', message = 'Duplicate project component codes are not allowed';
  end if;
  select count(*)::integer into v_component_count
  from projects.project_component_types c
  where c.code = any(v_component_codes) and c.is_active;
  if v_component_count <> cardinality(v_component_codes) then
    raise exception using errcode = '22023', message = 'Unknown or inactive project component';
  end if;

  if p_parent_project_id is null then
    v_owner := v_actor;
  else
    perform projects.lock_hierarchy(p_parent_project_id);
    select p.owner_user_id, p.status
      into v_owner, v_parent_status
    from projects.projects p
    where p.id = p_parent_project_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Parent project not found';
    end if;
    if v_parent_status <> 'active' then
      raise exception using errcode = '55000', message = 'Cannot create a child under an archived project';
    end if;
    if v_owner <> v_actor then
      raise exception using errcode = '42501', message = 'Only the project owner can create a child project';
    end if;
  end if;

  insert into projects.projects(
    parent_project_id, owner_user_id, created_by, name, description,
    project_type
  )
  values (
    p_parent_project_id, v_owner, v_actor, btrim(p_name), nullif(btrim(p_description), ''),
    p_project_type
  )
  returning * into v_project;

  insert into projects.project_components(project_id, component_type_id)
  select v_project.id, c.id
  from projects.project_component_types c
  where c.code = any(v_component_codes);

  insert into projects.project_visibility(project_id)
  values (v_project.id);

  insert into projects.project_audit_logs(project_id, actor_user_id, event_code, metadata)
  values (
    v_project.id, v_actor, 'project.created',
    jsonb_build_object(
      'parent_project_id', v_project.parent_project_id,
      'project_type', v_project.project_type,
      'component_codes', to_jsonb(v_component_codes)
    )
  );

  return jsonb_build_object(
    'id', v_project.id,
    'parent_project_id', v_project.parent_project_id,
    'name', v_project.name,
    'description', v_project.description,
    'project_type', v_project.project_type,
    'status', v_project.status,
    'created_at', v_project.created_at,
    'updated_at', v_project.updated_at,
    'component_codes', to_jsonb(v_component_codes)
  );
end;
$function$;

create or replace function projects.project_update_internal(
  p_project_id uuid,
  p_name text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_project projects.projects%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_project_id is null then
    raise exception using errcode = '22023', message = 'Project id is required';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Project name must contain 1 to 120 characters';
  end if;
  if p_description is not null and char_length(p_description) > 20000 then
    raise exception using errcode = '22023', message = 'Project description is too long';
  end if;

  perform projects.lock_hierarchy(p_project_id);

  select p.* into v_project
  from projects.projects p
  where p.id = p_project_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;
  if v_project.status <> 'active' then
    raise exception using errcode = '55000', message = 'Archived project cannot be updated';
  end if;
  if not projects.has_permission(p_project_id, 'project.update', false) then
    raise exception using errcode = '42501', message = 'Project update permission required';
  end if;

  update projects.projects
  set name = btrim(p_name),
      description = nullif(btrim(p_description), ''),
      updated_at = now()
  where id = p_project_id
  returning * into v_project;

  insert into projects.project_audit_logs(project_id, actor_user_id, event_code, metadata)
  values (
    p_project_id, v_actor, 'project.updated',
    jsonb_build_object('name', v_project.name)
  );

  return jsonb_build_object(
    'id', v_project.id,
    'parent_project_id', v_project.parent_project_id,
    'name', v_project.name,
    'description', v_project.description,
    'project_type', v_project.project_type,
    'status', v_project.status,
    'created_at', v_project.created_at,
    'updated_at', v_project.updated_at
  );
end;
$function$;

create or replace function projects.project_archive_internal(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_project projects.projects%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_project_id is null then
    raise exception using errcode = '22023', message = 'Project id is required';
  end if;

  perform projects.lock_hierarchy(p_project_id);

  select p.* into v_project
  from projects.projects p
  where p.id = p_project_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;
  if v_project.status <> 'active' then
    raise exception using errcode = '55000', message = 'Project is already archived';
  end if;
  if not projects.has_permission(p_project_id, 'project.archive', false) then
    raise exception using errcode = '42501', message = 'Project archive permission required';
  end if;

  update projects.projects
  set status = 'archived',
      archived_at = now(),
      archived_by = v_actor,
      updated_at = now()
  where id = p_project_id
  returning * into v_project;

  insert into projects.project_audit_logs(project_id, actor_user_id, event_code, metadata)
  values (p_project_id, v_actor, 'project.archived', '{}'::jsonb);

  return jsonb_build_object(
    'id', v_project.id,
    'status', v_project.status,
    'archived_at', v_project.archived_at
  );
end;
$function$;

create or replace function projects.project_restore_internal(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_project projects.projects%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_project_id is null then
    raise exception using errcode = '22023', message = 'Project id is required';
  end if;

  perform projects.lock_hierarchy(p_project_id);

  select p.* into v_project
  from projects.projects p
  where p.id = p_project_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;
  if v_project.status <> 'archived' then
    raise exception using errcode = '55000', message = 'Project is not archived';
  end if;
  if not projects.has_permission(p_project_id, 'project.archive', true) then
    raise exception using errcode = '42501', message = 'Project restore permission required';
  end if;

  update projects.projects
  set status = 'active',
      archived_at = null,
      archived_by = null,
      updated_at = now()
  where id = p_project_id
  returning * into v_project;

  insert into projects.project_audit_logs(project_id, actor_user_id, event_code, metadata)
  values (p_project_id, v_actor, 'project.restored', '{}'::jsonb);

  return jsonb_build_object(
    'id', v_project.id,
    'status', v_project.status,
    'archived_at', v_project.archived_at
  );
end;
$function$;

create or replace function projects.project_access_check_internal(
  p_project_id uuid,
  p_permission_code text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
     or p_project_id is null
     or p_permission_code is null
     or char_length(p_permission_code) > 100 then
    return false;
  end if;

  return projects.has_permission(p_project_id, p_permission_code, true);
end;
$function$;


revoke all on function projects.reject_audit_mutation() from public, anon, authenticated;
revoke all on function projects.lock_hierarchy(uuid) from public, anon, authenticated;
revoke all on function projects.has_permission(uuid, text, boolean) from public, anon, authenticated;

-- Narrow PostgREST endpoints. These wrappers do not elevate privileges.
create or replace function public.project_create(
  p_parent_project_id uuid,
  p_name text,
  p_description text,
  p_project_type text,
  p_component_codes text[] default '{}'::text[]
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select projects.project_create_internal(
    p_parent_project_id, p_name, p_description, p_project_type, p_component_codes
  );
$function$;

create or replace function public.project_update(
  p_project_id uuid, p_name text, p_description text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select projects.project_update_internal(p_project_id, p_name, p_description);
$function$;

create or replace function public.project_archive(p_project_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select projects.project_archive_internal(p_project_id);
$function$;

create or replace function public.project_restore(p_project_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select projects.project_restore_internal(p_project_id);
$function$;

create or replace function public.project_access_check(
  p_project_id uuid, p_permission_code text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select projects.project_access_check_internal(p_project_id, p_permission_code);
$function$;

-- Authenticated callers may enter the private schema only to invoke these
-- audited SECURITY DEFINER operations. Base tables remain inaccessible and
-- the schema must remain absent from PostgREST's exposed-schema allowlist.
revoke all on function projects.project_create_internal(uuid, text, text, text, text[]) from public, anon, authenticated;
revoke all on function projects.project_update_internal(uuid, text, text) from public, anon, authenticated;
revoke all on function projects.project_archive_internal(uuid) from public, anon, authenticated;
revoke all on function projects.project_restore_internal(uuid) from public, anon, authenticated;
revoke all on function projects.project_access_check_internal(uuid, text) from public, anon, authenticated;

grant usage on schema projects to authenticated;
grant execute on function projects.project_create_internal(uuid, text, text, text, text[]) to authenticated;
grant execute on function projects.project_update_internal(uuid, text, text) to authenticated;
grant execute on function projects.project_archive_internal(uuid) to authenticated;
grant execute on function projects.project_restore_internal(uuid) to authenticated;
grant execute on function projects.project_access_check_internal(uuid, text) to authenticated;

revoke all on function public.project_create(uuid, text, text, text, text[]) from public, anon, authenticated;
revoke all on function public.project_update(uuid, text, text) from public, anon, authenticated;
revoke all on function public.project_archive(uuid) from public, anon, authenticated;
revoke all on function public.project_restore(uuid) from public, anon, authenticated;
revoke all on function public.project_access_check(uuid, text) from public, anon, authenticated;

grant execute on function public.project_create(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.project_update(uuid, text, text) to authenticated;
grant execute on function public.project_archive(uuid) to authenticated;
grant execute on function public.project_restore(uuid) to authenticated;
grant execute on function public.project_access_check(uuid, text) to authenticated;

-- Functions are narrow invoker endpoints; internal elevation is isolated.












revoke all on projects.project_audit_logs from public, anon, authenticated;

commit;
