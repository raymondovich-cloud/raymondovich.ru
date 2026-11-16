-- Project deletion requires a fresh password-authenticated JWT (auth_time <= 5 minutes).
-- The function removes the selected project and every descendant in one transaction.

create or replace function projects.project_delete_internal(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_auth_time_text text := auth.jwt() ->> 'auth_time';
  v_auth_time bigint;
  v_project_owner uuid;
  v_project_ids uuid[];
  v_project_id uuid;
  v_deleted_count integer := 0;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if v_auth_time_text is null or v_auth_time_text !~ '^[0-9]{1,12}$' then
    raise exception using errcode = '28000', message = 'Recent password confirmation required';
  end if;

  v_auth_time := v_auth_time_text::bigint;
  if v_auth_time < extract(epoch from clock_timestamp())::bigint - 300 then
    raise exception using errcode = '28000', message = 'Recent password confirmation required';
  end if;

  if p_project_id is null then
    raise exception using errcode = '22023', message = 'Project id is required';
  end if;

  perform projects.lock_hierarchy(p_project_id);

  select p.owner_user_id
    into v_project_owner
  from projects.projects p
  where p.id = p_project_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  if v_project_owner <> v_actor then
    raise exception using errcode = '42501', message = 'Only the project owner can delete this project';
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
  select array_agg(id order by depth desc)
    into v_project_ids
  from project_tree;

  if coalesce(cardinality(v_project_ids), 0) = 0 then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  delete from projects.project_access_grants
  where project_id = any(v_project_ids);

  delete from projects.project_memberships
  where project_id = any(v_project_ids);

  delete from projects.project_role_permissions
  where role_id in (
    select r.id
    from projects.project_roles r
    where r.project_id = any(v_project_ids)
  );

  delete from projects.project_components
  where project_id = any(v_project_ids);

  delete from projects.project_visibility
  where project_id = any(v_project_ids);

  delete from projects.project_audit_logs
  where project_id = any(v_project_ids);

  delete from projects.project_roles
  where project_id = any(v_project_ids);

  foreach v_project_id in array v_project_ids loop
    delete from projects.projects
    where id = v_project_id and owner_user_id = v_actor;
    v_deleted_count := v_deleted_count + 1;
  end loop;

  return jsonb_build_object(
    'deleted', true,
    'deleted_projects', v_deleted_count
  );
end;
$function$;

create or replace function public.project_delete(p_project_id uuid)
returns jsonb
language sql
security invoker
set search_path to ''
as $function$
  select projects.project_delete_internal(p_project_id);
$function$;

revoke all on function projects.project_delete_internal(uuid) from public, anon, authenticated;
grant execute on function projects.project_delete_internal(uuid) to authenticated, service_role;
revoke all on function public.project_delete(uuid) from public, anon;
grant execute on function public.project_delete(uuid) to authenticated, service_role;
