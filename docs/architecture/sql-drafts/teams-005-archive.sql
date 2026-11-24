-- Teams 005: owner-only Team archiving.
-- Preserves Team data and memberships; closes pending invitations atomically.

create or replace function teams.team_archive_internal(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_team teams.teams%rowtype;
  v_now timestamptz := now();
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
      'archived_at', v_team.updated_at
    );
  end if;

  if v_team.status <> 'active' then
    raise exception using errcode = '55000', message = 'Team cannot be archived in its current state';
  end if;

  update teams.teams
  set status = 'archived',
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

revoke all on function teams.team_archive_internal(uuid) from public, anon, authenticated;
grant execute on function teams.team_archive_internal(uuid) to authenticated;

create or replace function public.team_archive(p_team_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select teams.team_archive_internal(p_team_id);
$function$;

revoke all on function public.team_archive(uuid) from public, anon, authenticated;
grant execute on function public.team_archive(uuid) to authenticated;
