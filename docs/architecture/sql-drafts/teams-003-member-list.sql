-- APPLIED MIGRATION SOURCE — DO NOT REAPPLY
-- Raymondovich Teams B1: privacy-minimized active member list
-- Version: 1.0.0
-- Target: Supabase PostgreSQL 17.11
-- Applied to development Supabase project yajybgdorhxebbigwjgi as migration 20261124081519. Historical source; do not reapply.

begin;

create or replace function teams.team_members_list_internal(p_team_id uuid)
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

  if not exists (
    select 1
    from teams.teams t
    join teams.memberships actor_membership
      on actor_membership.team_id = t.id
    where t.id = p_team_id
      and t.status = 'active'
      and actor_membership.user_id = v_actor
      and actor_membership.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Active Team membership required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'username', coalesce(profile.username, 'Пользователь'),
        'role', member.role,
        'joined_at', member.joined_at
      )
      order by
        case member.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,
        member.joined_at asc
    ),
    '[]'::jsonb
  )
  into v_result
  from teams.memberships member
  left join private.user_profiles profile
    on profile.user_id = member.user_id
  where member.team_id = p_team_id
    and member.status = 'active';

  return v_result;
end;
$function$;

revoke all on function teams.team_members_list_internal(uuid) from public, anon, authenticated;
grant execute on function teams.team_members_list_internal(uuid) to authenticated;

create or replace function public.team_members_list(p_team_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select teams.team_members_list_internal(p_team_id);
$function$;

revoke all on function public.team_members_list(uuid) from public, anon, authenticated;
grant execute on function public.team_members_list(uuid) to authenticated;

commit;
