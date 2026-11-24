-- Workspace Trash 001: archived project/team listings and Team restoration.
-- Existing Project restore RPC is reused by the client.

create or replace function teams.team_archived_list_internal()
returns jsonb language sql stable security definer set search_path = '' as $function$
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'description',t.description,'status',t.status,'role',m.role,'created_at',t.created_at,'archived_at',t.updated_at) order by t.updated_at desc),'[]'::jsonb)
  from teams.teams t join teams.memberships m on m.team_id=t.id and m.user_id=auth.uid() and m.role='owner' and m.status='active'
  where t.owner_user_id=auth.uid() and t.status='archived';
$function$;
revoke all on function teams.team_archived_list_internal() from public,anon,authenticated;
grant execute on function teams.team_archived_list_internal() to authenticated;
create or replace function public.team_archived_list() returns jsonb language sql stable security invoker set search_path = '' as $function$ select teams.team_archived_list_internal(); $function$;
revoke all on function public.team_archived_list() from public,anon,authenticated;
grant execute on function public.team_archived_list() to authenticated;

create or replace function teams.team_restore_internal(p_team_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_actor uuid:=auth.uid(); v_team teams.teams%rowtype; v_now timestamptz:=now();
begin
 if v_actor is null then raise exception using errcode='28000',message='Authentication required'; end if;
 if p_team_id is null then raise exception using errcode='22023',message='Team id is required'; end if;
 select t.* into v_team from teams.teams t where t.id=p_team_id for update;
 if not found then raise exception using errcode='P0002',message='Team not found'; end if;
 if v_team.owner_user_id is distinct from v_actor or not exists(select 1 from teams.memberships m where m.team_id=p_team_id and m.user_id=v_actor and m.role='owner' and m.status='active') then raise exception using errcode='42501',message='Only the Team owner may restore this Team'; end if;
 if v_team.status='active' then return jsonb_build_object('id',v_team.id,'status','active'); end if;
 if v_team.status<>'archived' then raise exception using errcode='55000',message='Team cannot be restored in its current state'; end if;
 update teams.teams set status='active',updated_at=v_now where id=p_team_id;
 insert into teams.audit_logs(team_id,actor_user_id,event_code,metadata) values(p_team_id,v_actor,'team.restored',jsonb_build_object('previous_status','archived','restored_at',v_now));
 return jsonb_build_object('id',p_team_id,'status','active','restored_at',v_now);
end; $function$;
revoke all on function teams.team_restore_internal(uuid) from public,anon,authenticated;
grant execute on function teams.team_restore_internal(uuid) to authenticated;
create or replace function public.team_restore(p_team_id uuid) returns jsonb language sql security invoker set search_path = '' as $function$ select teams.team_restore_internal(p_team_id); $function$;
revoke all on function public.team_restore(uuid) from public,anon,authenticated;
grant execute on function public.team_restore(uuid) to authenticated;

create or replace function projects.project_archived_list_internal()
returns jsonb language plpgsql stable security definer set search_path = '' as $function$
declare v_actor uuid:=auth.uid(); v_projects jsonb;
begin
 if v_actor is null then raise exception using errcode='28000',message='Authentication required'; end if;
 select coalesce(jsonb_agg(rows.project_data order by rows.archived_at desc nulls last,rows.id),'[]'::jsonb) into v_projects
 from (select p.id,p.archived_at,jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'project_type',p.project_type,'status',p.status,'role',case when p.owner_user_id=v_actor then 'owner' else 'participant' end,'created_at',p.created_at,'archived_at',p.archived_at,'components',coalesce((select jsonb_agg(jsonb_build_object('code',ct.code,'name',ct.name) order by ct.sort_order,ct.code) from projects.project_components pc join projects.project_component_types ct on ct.id=pc.component_type_id where pc.project_id=p.id),'[]'::jsonb)) project_data from projects.projects p where p.status='archived' and projects.has_permission(p.id,'project.archive',true)) rows;
 return jsonb_build_object('projects',v_projects,'total',jsonb_array_length(v_projects));
end; $function$;
revoke all on function projects.project_archived_list_internal() from public,anon,authenticated;
grant execute on function projects.project_archived_list_internal() to authenticated;
create or replace function public.project_archived_list() returns jsonb language sql stable security invoker set search_path = '' as $function$ select projects.project_archived_list_internal(); $function$;
revoke all on function public.project_archived_list() from public,anon,authenticated;
grant execute on function public.project_archived_list() to authenticated;
