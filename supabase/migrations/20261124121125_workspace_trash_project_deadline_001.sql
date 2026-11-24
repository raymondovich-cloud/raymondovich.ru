-- Show the effective deletion deadline for a project hierarchy.
-- A parent is removed only after all descendants have been archived and retained for 30 days.

create or replace function projects.project_archived_list_internal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_projects jsonb;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select coalesce(
    jsonb_agg(rows.project_data order by rows.archived_at desc nulls last, rows.id),
    '[]'::jsonb
  )
  into v_projects
  from (
    select
      p.id,
      p.archived_at,
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'project_type', p.project_type,
        'status', p.status,
        'role', case when p.owner_user_id = v_actor then 'owner' else 'participant' end,
        'created_at', p.created_at,
        'archived_at', p.archived_at,
        'deletion_at', retention.deletion_at,
        'retention_blocked', retention.retention_blocked,
        'components', coalesce((
          select jsonb_agg(
            jsonb_build_object('code', ct.code, 'name', ct.name)
            order by ct.sort_order, ct.code
          )
          from projects.project_components pc
          join projects.project_component_types ct on ct.id = pc.component_type_id
          where pc.project_id = p.id
        ), '[]'::jsonb)
      ) as project_data
    from projects.projects p
    cross join lateral (
      with recursive project_tree(id, status, archived_at) as (
        select root.id, root.status, root.archived_at
        from projects.projects root
        where root.id = p.id
        union all
        select child.id, child.status, child.archived_at
        from projects.projects child
        join project_tree parent on child.parent_project_id = parent.id
      )
      select
        case
          when coalesce(bool_and(status = 'archived' and archived_at is not null), false)
          then max(archived_at) + interval '30 days'
          else null
        end as deletion_at,
        not coalesce(bool_and(status = 'archived' and archived_at is not null), false) as retention_blocked
      from project_tree
    ) retention
    where p.status = 'archived'
      and projects.has_permission(p.id, 'project.archive', true)
  ) rows;

  return jsonb_build_object('projects', v_projects, 'total', jsonb_array_length(v_projects));
end;
$function$;
