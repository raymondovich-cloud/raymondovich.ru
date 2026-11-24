-- APPLIED MIGRATION SOURCE
-- Raymondovich Teams core backend, phase 1
-- Version: 1.0.0
-- Created: 2026-11-24
-- Target: Supabase PostgreSQL 17.11
-- Scope: Team core tables, create entitlement grants, audit, create/list/get RPC
-- Applied to Supabase project yajybgdorhxebbigwjgi as migration 20261124075310.
-- Historical source. Do not reapply manually.

begin;

create schema if not exists teams;
revoke all on schema teams from public, anon, authenticated;
grant usage on schema teams to authenticated;

create table teams.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_length check (char_length(name) between 2 and 80),
  constraint teams_name_trimmed check (name = btrim(name)),
  constraint teams_description_length check (
    description is null or char_length(description) <= 500
  ),
  constraint teams_status_check check (status in ('active', 'archived'))
);

create index teams_owner_created_idx
  on teams.teams(owner_user_id, created_at desc);

create table teams.memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams.teams(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_memberships_team_user_unique unique (team_id, user_id),
  constraint teams_memberships_role_check
    check (role in ('owner', 'admin', 'manager', 'member')),
  constraint teams_memberships_status_check
    check (status in ('active', 'suspended'))
);

create index teams_memberships_user_status_idx
  on teams.memberships(user_id, status, created_at desc);

create index teams_memberships_team_status_idx
  on teams.memberships(team_id, status);

create table teams.create_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  source text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint teams_create_entitlements_source_check
    check (source in ('admin_grant', 'subscription')),
  constraint teams_create_entitlements_period_check
    check (ends_at is null or ends_at > starts_at),
  constraint teams_create_entitlements_note_length
    check (note is null or char_length(note) <= 500)
);

create index teams_create_entitlements_active_idx
  on teams.create_entitlements(user_id, starts_at, ends_at)
  where revoked_at is null;

create table teams.audit_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams.teams(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_code varchar(100) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint teams_audit_event_code_format
    check (event_code ~ '^[a-z][a-z0-9_]*[.][a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)*$'),
  constraint teams_audit_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index teams_audit_team_created_idx
  on teams.audit_logs(team_id, created_at desc);
create index teams_audit_actor_created_idx
  on teams.audit_logs(actor_user_id, created_at desc);

alter table teams.teams enable row level security;
alter table teams.memberships enable row level security;
alter table teams.create_entitlements enable row level security;
alter table teams.audit_logs enable row level security;

revoke all on all tables in schema teams from public, anon, authenticated;
revoke all on all sequences in schema teams from public, anon, authenticated;

create or replace function teams.reject_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'Team audit records are immutable';
end;
$function$;

revoke all on function teams.reject_audit_mutation() from public, anon, authenticated;

create trigger teams_audit_logs_immutable
before update or delete on teams.audit_logs
for each row execute function teams.reject_audit_mutation();

create or replace function teams.has_create_entitlement(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_app_metadata jsonb;
begin
  if p_user_id is null then
    return false;
  end if;

  select u.raw_app_meta_data
    into v_app_metadata
  from auth.users u
  where u.id = p_user_id;

  if not found then
    return false;
  end if;

  -- Trusted server-managed owner metadata; raw_user_meta_data is deliberately ignored.
  if v_app_metadata ->> 'raymondovich_role' = 'owner' then
    return true;
  end if;

  return exists (
    select 1
    from teams.create_entitlements e
    where e.user_id = p_user_id
      and e.revoked_at is null
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
  );
end;
$function$;

revoke all on function teams.has_create_entitlement(uuid) from public, anon, authenticated;

create or replace function teams.team_create_internal(
  p_name text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_team teams.teams%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Team name must contain 2 to 80 characters';
  end if;

  if p_description is not null and char_length(p_description) > 500 then
    raise exception using errcode = '22023', message = 'Team description is too long';
  end if;

  if not teams.has_create_entitlement(v_actor) then
    raise exception using errcode = '42501', message = 'Team creation entitlement required';
  end if;

  insert into teams.teams(name, description, owner_user_id)
  values (btrim(p_name), nullif(btrim(p_description), ''), v_actor)
  returning * into v_team;

  insert into teams.memberships(team_id, user_id, role, status)
  values (v_team.id, v_actor, 'owner', 'active');

  insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
  values (
    v_team.id,
    v_actor,
    'team.created',
    jsonb_build_object('name', v_team.name)
  );

  return jsonb_build_object(
    'id', v_team.id,
    'name', v_team.name,
    'description', v_team.description,
    'owner_user_id', v_team.owner_user_id,
    'status', v_team.status,
    'role', 'owner',
    'created_at', v_team.created_at
  );
end;
$function$;

revoke all on function teams.team_create_internal(text, text) from public, anon, authenticated;
grant execute on function teams.team_create_internal(text, text) to authenticated;

create or replace function teams.team_list_internal()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'status', t.status,
        'role', m.role,
        'created_at', t.created_at
      )
      order by t.created_at desc
    ),
    '[]'::jsonb
  )
  from teams.memberships m
  join teams.teams t on t.id = m.team_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and t.status = 'active';
$function$;

revoke all on function teams.team_list_internal() from public, anon, authenticated;
grant execute on function teams.team_list_internal() to authenticated;

create or replace function teams.team_get_internal(p_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_result jsonb;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_team_id is null then
    raise exception using errcode = '22023', message = 'Team id is required';
  end if;

  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'description', t.description,
    'owner_user_id', t.owner_user_id,
    'status', t.status,
    'role', m.role,
    'created_at', t.created_at,
    'updated_at', t.updated_at
  )
  into v_result
  from teams.teams t
  join teams.memberships m on m.team_id = t.id
  where t.id = p_team_id
    and t.status = 'active'
    and m.user_id = v_actor
    and m.status = 'active';

  if v_result is null then
    raise exception using errcode = '42501', message = 'Active Team membership required';
  end if;

  return v_result;
end;
$function$;

revoke all on function teams.team_get_internal(uuid) from public, anon, authenticated;
grant execute on function teams.team_get_internal(uuid) to authenticated;

-- Public API wrappers are invoker functions. Privileged work stays in the
-- non-exposed teams schema, following the existing Projects RPC pattern.
create or replace function public.team_create(
  p_name text,
  p_description text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select teams.team_create_internal(p_name, p_description);
$function$;

create or replace function public.team_list()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select teams.team_list_internal();
$function$;

create or replace function public.team_get(p_team_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select teams.team_get_internal(p_team_id);
$function$;

revoke all on function public.team_create(text, text) from public, anon, authenticated;
revoke all on function public.team_list() from public, anon, authenticated;
revoke all on function public.team_get(uuid) from public, anon, authenticated;

grant execute on function public.team_create(text, text) to authenticated;
grant execute on function public.team_list() to authenticated;
grant execute on function public.team_get(uuid) to authenticated;

commit;
