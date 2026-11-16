-- Raymondovich Projects list RPC
-- Version: 1.0.0
-- Created: 2026-11-16
-- Scope: authenticated project listing with permission-aware visibility.

begin;

create or replace function projects.project_list_internal()
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
    jsonb_agg(project_rows.project_data order by project_rows.created_at desc, project_rows.id),
    '[]'::jsonb
  )
  into v_projects
  from (
    select
      p.id,
      p.created_at,
      jsonb_build_object(
        'id', p.id,
        'parent_project_id', p.parent_project_id,
        'name', p.name,
        'description', p.description,
        'project_type', p.project_type,
        'status', p.status,
        'role', case when p.owner_user_id = v_actor then 'owner' else 'participant' end,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'components', coalesce((
          select jsonb_agg(
            jsonb_build_object('code', component_type.code, 'name', component_type.name)
            order by component_type.sort_order, component_type.code
          )
          from projects.project_components project_component
          join projects.project_component_types component_type
            on component_type.id = project_component.component_type_id
          where project_component.project_id = p.id
        ), '[]'::jsonb)
      ) as project_data
    from projects.projects p
    where p.status = 'active'
      and projects.has_permission(p.id, 'project.view')
  ) as project_rows;

  return jsonb_build_object(
    'projects', v_projects,
    'total', jsonb_array_length(v_projects)
  );
end;
$function$;

revoke all on function projects.project_list_internal() from public, anon, authenticated;
grant execute on function projects.project_list_internal() to authenticated;

create or replace function public.project_list()
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select projects.project_list_internal();
$function$;

revoke all on function public.project_list() from public, anon;
grant execute on function public.project_list() to authenticated;

commit;
