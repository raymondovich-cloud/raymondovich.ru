-- Preserve immutable project audit history when an owner requests project deletion.
-- Project rows are archived (including all descendants) instead of physically deleted.

CREATE OR REPLACE FUNCTION projects.project_delete_internal(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_amr jsonb := coalesce(auth.jwt() -> 'amr', '[]'::jsonb);
  v_auth_time bigint;
  v_project_owner uuid;
  v_project_ids uuid[];
  v_archived_count integer := 0;
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

  select p.owner_user_id into v_project_owner
  from projects.projects p where p.id = p_project_id for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  if v_project_owner <> v_actor then
    raise exception using errcode = '42501', message = 'Only the project owner can delete this project';
  end if;

  with recursive project_tree(id, depth) as (
    select p.id, 0 from projects.projects p
    where p.id = p_project_id and p.owner_user_id = v_actor
    union all
    select child.id, parent.depth + 1
    from projects.projects child
    join project_tree parent on child.parent_project_id = parent.id
    where child.owner_user_id = v_actor
  )
  select array_agg(id order by depth desc) into v_project_ids from project_tree;

  if coalesce(cardinality(v_project_ids), 0) = 0 then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  -- Audit records are append-only and reference the project row. Deletion is
  -- therefore represented as an irreversible archive operation in the UI.
  -- Preserve project rows and their complete audit history.
  with archived_projects as (
    update projects.projects
    set status = 'archived',
        archived_at = coalesce(archived_at, clock_timestamp()),
        archived_by = coalesce(archived_by, v_actor),
        updated_at = clock_timestamp()
    where id = any(v_project_ids)
      and owner_user_id = v_actor
      and status = 'active'
    returning id
  ),
  audit_entries as (
    insert into projects.project_audit_logs(project_id, actor_user_id, event_code, metadata)
    select id, v_actor, 'project.archived',
           jsonb_build_object('reason', 'owner_requested_deletion')
    from archived_projects
    returning project_id
  )
  select count(*)::integer into v_archived_count from audit_entries;

  return jsonb_build_object(
    'deleted', true,
    'archived', true,
    'archived_projects', v_archived_count
  );
end;
$function$;
