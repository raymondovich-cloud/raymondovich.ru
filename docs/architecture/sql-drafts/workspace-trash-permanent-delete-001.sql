-- Workspace Trash Permanent Delete 001
-- Permanent deletion is separate from archive and restore operations.
-- Immutable audit history deliberately survives as an orphaned historical
-- reference (the original UUID remains in project_id/team_id).

alter table projects.project_audit_logs
  drop constraint if exists project_audit_logs_project_id_fkey;
comment on column projects.project_audit_logs.project_id is
  'Historical project UUID. Intentionally has no FK so immutable audit history survives permanent project deletion.';

alter table teams.audit_logs
  drop constraint if exists audit_logs_team_id_fkey;
comment on column teams.audit_logs.team_id is
  'Historical team UUID. Intentionally has no FK so immutable audit history survives permanent team deletion.';


create or replace function projects.project_permanent_delete_internal(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_amr jsonb := coalesce(auth.jwt() -> 'amr', '[]'::jsonb);
  v_auth_time bigint;
  v_project projects.projects%rowtype;
  v_project_ids uuid[];
  v_project_id uuid;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select max((entry.value ->> 'timestamp')::bigint)
    into v_auth_time
  from jsonb_array_elements(v_amr) as entry(value)
  where entry.value ->> 'method' = 'password'
    and coalesce(entry.value ->> 'timestamp', '') ~ '^[0-9]{1,12}$';

  if v_auth_time is null
     or v_auth_time < extract(epoch from clock_timestamp())::bigint - 300
     or v_auth_time > extract(epoch from clock_timestamp())::bigint + 60 then
    raise exception using errcode = '28000', message = 'Recent password confirmation required';
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
  if v_project.owner_user_id is distinct from v_actor then
    raise exception using errcode = '42501', message = 'Only the project owner can permanently delete this project';
  end if;
  if v_project.status <> 'archived' then
    raise exception using errcode = '55000', message = 'Project must be archived before permanent deletion';
  end if;

  with recursive project_tree(id, depth) as (
    select p.id, 0
    from projects.projects p
    where p.id = p_project_id and p.owner_user_id = v_actor
    union all
    select child.id, parent.depth + 1
    from projects.projects child
    join project_tree parent on child.parent_project_id = parent.id
    where child.owner_user_id = v_actor
  )
  select array_agg(id order by depth desc) into v_project_ids
  from project_tree;

  if coalesce(cardinality(v_project_ids), 0) = 0 then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  if exists (
    select 1 from projects.projects p
    where p.id = any(v_project_ids) and p.status <> 'archived'
  ) then
    raise exception using errcode = '55000', message = 'Every project in the hierarchy must be archived before permanent deletion';
  end if;

  delete from projects.project_role_permissions rp
  using projects.project_roles r
  where rp.role_id = r.id and r.project_id = any(v_project_ids);

  delete from projects.project_access_grants where project_id = any(v_project_ids);
  -- project_audit_logs are immutable and intentionally retained.
  delete from projects.project_components where project_id = any(v_project_ids);
  delete from projects.project_memberships where project_id = any(v_project_ids);
  delete from projects.project_visibility where project_id = any(v_project_ids);
  delete from projects.project_roles where project_id = any(v_project_ids);

  foreach v_project_id in array v_project_ids loop
    delete from projects.projects where id = v_project_id and owner_user_id = v_actor;
  end loop;

  return jsonb_build_object(
    'deleted', true,
    'deleted_projects', cardinality(v_project_ids)
  );
end;
$function$;

revoke all on function projects.project_permanent_delete_internal(uuid) from public, anon, authenticated;
grant execute on function projects.project_permanent_delete_internal(uuid) to authenticated;

create or replace function public.project_permanent_delete(p_project_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select projects.project_permanent_delete_internal(p_project_id);
$function$;

revoke all on function public.project_permanent_delete(uuid) from public, anon, authenticated;
grant execute on function public.project_permanent_delete(uuid) to authenticated;


create or replace function teams.team_permanent_delete_internal(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_amr jsonb := coalesce(auth.jwt() -> 'amr', '[]'::jsonb);
  v_auth_time bigint;
  v_team teams.teams%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select max((entry.value ->> 'timestamp')::bigint)
    into v_auth_time
  from jsonb_array_elements(v_amr) as entry(value)
  where entry.value ->> 'method' = 'password'
    and coalesce(entry.value ->> 'timestamp', '') ~ '^[0-9]{1,12}$';

  if v_auth_time is null
     or v_auth_time < extract(epoch from clock_timestamp())::bigint - 300
     or v_auth_time > extract(epoch from clock_timestamp())::bigint + 60 then
    raise exception using errcode = '28000', message = 'Recent password confirmation required';
  end if;

  if p_team_id is null then
    raise exception using errcode = '22023', message = 'Team id is required';
  end if;

  select t.* into v_team
  from teams.teams t
  where t.id = p_team_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Team not found';
  end if;
  if v_team.owner_user_id is distinct from v_actor
     or not exists (
       select 1 from teams.memberships m
       where m.team_id = p_team_id
         and m.user_id = v_actor
         and m.role = 'owner'
         and m.status = 'active'
     ) then
    raise exception using errcode = '42501', message = 'Only the Team owner can permanently delete this Team';
  end if;
  if v_team.status <> 'archived' then
    raise exception using errcode = '55000', message = 'Team must be archived before permanent deletion';
  end if;

  delete from teams.invitations where team_id = p_team_id;
  delete from teams.memberships where team_id = p_team_id;
  -- teams.audit_logs are immutable and intentionally retained.
  delete from teams.teams where id = p_team_id;

  return jsonb_build_object('deleted', true, 'team_id', p_team_id);
end;
$function$;

revoke all on function teams.team_permanent_delete_internal(uuid) from public, anon, authenticated;
grant execute on function teams.team_permanent_delete_internal(uuid) to authenticated;

create or replace function public.team_permanent_delete(p_team_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select teams.team_permanent_delete_internal(p_team_id);
$function$;

revoke all on function public.team_permanent_delete(uuid) from public, anon, authenticated;
grant execute on function public.team_permanent_delete(uuid) to authenticated;
