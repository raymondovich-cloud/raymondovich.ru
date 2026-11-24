-- Workspace trash retention: 30 days from the archive timestamp.
-- Projects and Teams are permanently removed by a restricted pg_cron task.
-- Immutable audit records are intentionally retained.

begin;

alter table teams.teams
  add column if not exists archived_at timestamptz;

update teams.teams
set archived_at = updated_at
where status = 'archived'
  and archived_at is null;

create index if not exists teams_archived_retention_idx
  on teams.teams (archived_at)
  where status = 'archived';

create index if not exists projects_archived_retention_idx
  on projects.projects (archived_at)
  where status = 'archived';

create or replace function teams.team_archive_internal(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_team teams.teams%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_team_id is null then
    raise exception using errcode = '22023', message = 'Team id is required';
  end if;

  select t.*
  into v_team
  from teams.teams t
  where t.id = p_team_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Team not found';
  end if;

  if v_team.owner_user_id is distinct from v_actor
     or not exists (
       select 1
       from teams.memberships m
       where m.team_id = p_team_id
         and m.user_id = v_actor
         and m.role = 'owner'
         and m.status = 'active'
     ) then
    raise exception using errcode = '42501', message = 'Only the Team owner may archive this Team';
  end if;

  if v_team.status = 'archived' then
    return jsonb_build_object(
      'id', v_team.id,
      'status', 'archived',
      'archived_at', v_team.archived_at
    );
  end if;

  if v_team.status <> 'active' then
    raise exception using errcode = '55000', message = 'Team cannot be archived in its current state';
  end if;

  update teams.teams
  set status = 'archived',
      archived_at = v_now,
      updated_at = v_now
  where id = p_team_id;

  with cancelled_invitations as (
    update teams.invitations
    set status = 'cancelled',
        cancelled_at = v_now
    where team_id = p_team_id
      and status = 'pending'
    returning id
  )
  update notifications.notifications n
  set resolved_at = coalesce(n.resolved_at, v_now),
      read_at = coalesce(n.read_at, v_now)
  where n.notification_type = 'team.invitation'
    and n.payload ->> 'invitation_id' in (
      select ci.id::text from cancelled_invitations ci
    );

  insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
  values (
    p_team_id,
    v_actor,
    'team.archived',
    jsonb_build_object('previous_status', 'active', 'archived_at', v_now)
  );

  return jsonb_build_object(
    'id', p_team_id,
    'status', 'archived',
    'archived_at', v_now
  );
end;
$function$;

create or replace function teams.team_restore_internal(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_team teams.teams%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_team_id is null then
    raise exception using errcode = '22023', message = 'Team id is required';
  end if;

  select t.*
  into v_team
  from teams.teams t
  where t.id = p_team_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Team not found';
  end if;

  if v_team.owner_user_id is distinct from v_actor
     or not exists (
       select 1
       from teams.memberships m
       where m.team_id = p_team_id
         and m.user_id = v_actor
         and m.role = 'owner'
         and m.status = 'active'
     ) then
    raise exception using errcode = '42501', message = 'Only the Team owner may restore this Team';
  end if;

  if v_team.status = 'active' then
    return jsonb_build_object('id', v_team.id, 'status', 'active');
  end if;

  if v_team.status <> 'archived' then
    raise exception using errcode = '55000', message = 'Team cannot be restored in its current state';
  end if;

  update teams.teams
  set status = 'active',
      archived_at = null,
      updated_at = v_now
  where id = p_team_id;

  insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
  values (
    p_team_id,
    v_actor,
    'team.restored',
    jsonb_build_object('previous_status', 'archived', 'restored_at', v_now)
  );

  return jsonb_build_object('id', p_team_id, 'status', 'active', 'restored_at', v_now);
end;
$function$;

create or replace function teams.team_archived_list_internal()
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
        'created_at', t.created_at,
        'archived_at', t.archived_at
      )
      order by t.archived_at desc
    ),
    '[]'::jsonb
  )
  from teams.teams t
  join teams.memberships m
    on m.team_id = t.id
   and m.user_id = auth.uid()
   and m.role = 'owner'
   and m.status = 'active'
  where t.owner_user_id = auth.uid()
    and t.status = 'archived';
$function$;

create or replace function private.workspace_trash_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_cutoff timestamptz := clock_timestamp() - interval '30 days';
  v_team_id uuid;
  v_root record;
  v_project_id uuid;
  v_project_ids uuid[];
  v_tree_eligible boolean;
  v_deleted_teams integer := 0;
  v_deleted_projects integer := 0;
begin
  if not pg_catalog.pg_try_advisory_xact_lock(78123042, 30) then
    return jsonb_build_object('skipped', true, 'reason', 'cleanup_already_running');
  end if;

  -- Teams are eligible 30 days after their dedicated archived_at timestamp.
  for v_team_id in
    select t.id
    from teams.teams t
    where t.status = 'archived'
      and t.archived_at <= v_cutoff
    order by t.archived_at, t.id
    for update skip locked
  loop
    delete from teams.invitations where team_id = v_team_id;
    delete from teams.memberships where team_id = v_team_id;
    delete from teams.teams where id = v_team_id and status = 'archived';
    if found then
      v_deleted_teams := v_deleted_teams + 1;
    end if;
  end loop;

  -- A project branch is removed only when every descendant is archived,
  -- older than the retention window, and owned by the same account.
  -- The hierarchy lock serializes cleanup with normal project mutations.
  for v_root in
    select p.id, p.owner_user_id
    from projects.projects p
    left join projects.projects parent on parent.id = p.parent_project_id
    where p.status = 'archived'
      and p.archived_at <= v_cutoff
      and (p.parent_project_id is null or parent.status <> 'archived')
    order by p.archived_at, p.id
  loop
    perform projects.lock_hierarchy(v_root.id);

    with recursive project_tree(id, depth, owner_user_id, status, archived_at) as (
      select p.id, 0, p.owner_user_id, p.status, p.archived_at
      from projects.projects p
      where p.id = v_root.id
      union all
      select child.id, parent.depth + 1, child.owner_user_id, child.status, child.archived_at
      from projects.projects child
      join project_tree parent on child.parent_project_id = parent.id
    )
    select
      array_agg(id order by depth desc),
      coalesce(bool_and(
        owner_user_id = v_root.owner_user_id
        and status = 'archived'
        and archived_at <= v_cutoff
      ), false)
    into v_project_ids, v_tree_eligible
    from project_tree;

    if not coalesce(v_tree_eligible, false)
       or coalesce(cardinality(v_project_ids), 0) = 0 then
      continue;
    end if;

    delete from projects.project_role_permissions rp
    using projects.project_roles r
    where rp.role_id = r.id
      and r.project_id = any(v_project_ids);

    delete from projects.project_access_grants
    where project_id = any(v_project_ids);

    delete from projects.project_components
    where project_id = any(v_project_ids);

    delete from projects.project_memberships
    where project_id = any(v_project_ids);

    delete from projects.project_visibility
    where project_id = any(v_project_ids);

    delete from projects.project_roles
    where project_id = any(v_project_ids);

    foreach v_project_id in array v_project_ids loop
      delete from projects.projects
      where id = v_project_id
        and owner_user_id = v_root.owner_user_id
        and status = 'archived';
      if found then
        v_deleted_projects := v_deleted_projects + 1;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'deleted_teams', v_deleted_teams,
    'deleted_projects', v_deleted_projects,
    'retention_days', 30,
    'cutoff_at', v_cutoff
  );
end;
$function$;

revoke all on function private.workspace_trash_cleanup() from public, anon, authenticated;

-- Keep the cleanup entry point private: only the scheduled database job executes it.
do $schedule$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'workspace-trash-retention-cleanup'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'workspace-trash-retention-cleanup',
    '*/15 * * * *',
    'select private.workspace_trash_cleanup();'
  );
end;
$schedule$;

commit;
