-- APPLIED MIGRATION SOURCE — DO NOT REAPPLY
-- Raymondovich Teams B2: invitations + shared notification inbox
-- Version: 1.0.0
-- Target: Supabase PostgreSQL 17.11
-- Applied to development Supabase project yajybgdorhxebbigwjgi as migration 20261124083432.
-- Scope: account-bound Team invitations and the first event type in the
-- ecosystem-wide notification center. No Project permissions are modified.

begin;

create schema if not exists notifications;
revoke all on schema notifications from public, anon, authenticated;
grant usage on schema notifications to authenticated;

create table notifications.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  resolved_at timestamptz,
  constraint notifications_type_format
    check (notification_type ~ '^[a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)+$'),
  constraint notifications_title_length
    check (char_length(title) between 1 and 160),
  constraint notifications_body_length
    check (char_length(body) between 1 and 1000),
  constraint notifications_payload_object
    check (jsonb_typeof(payload) = 'object')
);

create index notifications_recipient_created_idx
  on notifications.notifications(recipient_user_id, created_at desc);
create index notifications_recipient_unread_idx
  on notifications.notifications(recipient_user_id, created_at desc)
  where read_at is null and resolved_at is null;

alter table notifications.notifications enable row level security;
revoke all on all tables in schema notifications from public, anon, authenticated;
revoke all on all sequences in schema notifications from public, anon, authenticated;

create table teams.invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams.teams(id) on delete restrict,
  invitee_user_id uuid not null references auth.users(id) on delete restrict,
  invited_by_user_id uuid not null references auth.users(id) on delete restrict,
  requested_role text not null default 'member',
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  cancelled_at timestamptz,
  constraint teams_invitations_role_check
    check (requested_role in ('admin', 'manager', 'member')),
  constraint teams_invitations_status_check
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  constraint teams_invitations_message_length
    check (message is null or char_length(message) <= 500),
  constraint teams_invitations_expiry_check
    check (expires_at > created_at)
);

create unique index teams_invitations_one_pending_idx
  on teams.invitations(team_id, invitee_user_id)
  where status = 'pending';
create index teams_invitations_inviter_created_idx
  on teams.invitations(invited_by_user_id, created_at desc);
create index teams_invitations_invitee_created_idx
  on teams.invitations(invitee_user_id, created_at desc);
create index teams_invitations_team_created_idx
  on teams.invitations(team_id, created_at desc);

alter table teams.invitations enable row level security;
revoke all on teams.invitations from public, anon, authenticated;

-- Notifications are immutable event records except for recipient read/resolution
-- markers. All content and payload fields are written by trusted RPC internals.
create or replace function notifications.list_internal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_items jsonb;
  v_unread integer;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select count(*)::integer
    into v_unread
  from notifications.notifications n
  where n.recipient_user_id = v_actor
    and n.read_at is null
    and n.resolved_at is null;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'type', n.notification_type,
        'title', n.title,
        'body', n.body,
        'payload', n.payload,
        'created_at', n.created_at,
        'read_at', n.read_at,
        'resolved_at', n.resolved_at
      )
      order by n.created_at desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from notifications.notifications
    where recipient_user_id = v_actor
    order by created_at desc
    limit 100
  ) n;

  return jsonb_build_object('items', v_items, 'unread_count', v_unread);
end;
$function$;

create or replace function notifications.mark_read_internal(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_notification notifications.notifications%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_notification_id is null then
    raise exception using errcode = '22023', message = 'Notification id is required';
  end if;

  update notifications.notifications n
  set read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id
    and n.recipient_user_id = v_actor
  returning n.* into v_notification;

  if not found then
    raise exception using errcode = '42501', message = 'Notification not found';
  end if;

  return jsonb_build_object('id', v_notification.id, 'read_at', v_notification.read_at);
end;
$function$;

revoke all on function notifications.list_internal() from public, anon, authenticated;
revoke all on function notifications.mark_read_internal(uuid) from public, anon, authenticated;
grant execute on function notifications.list_internal() to authenticated;
grant execute on function notifications.mark_read_internal(uuid) to authenticated;

create or replace function teams.team_invite_internal(
  p_team_id uuid,
  p_username text,
  p_role text default 'member',
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_invitee uuid;
  v_invitee_username text;
  v_inviter_username text;
  v_team teams.teams%rowtype;
  v_pending teams.invitations%rowtype;
  v_invitation teams.invitations%rowtype;
  v_message text := nullif(btrim(p_message), '');
  v_lock_actor bigint;
  v_lock_invitee bigint;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if p_team_id is null then
    raise exception using errcode = '22023', message = 'Team id is required';
  end if;
  if p_username is null or lower(btrim(p_username)) !~ '^[a-z0-9][a-z0-9._-]{2,23}$' then
    raise exception using errcode = '22023', message = 'Enter an exact Raymondovich username';
  end if;
  if p_role is null or p_role not in ('admin', 'manager', 'member') then
    raise exception using errcode = '22023', message = 'Unsupported invitation role';
  end if;
  if v_message is not null and char_length(v_message) > 500 then
    raise exception using errcode = '22023', message = 'Invitation message is too long';
  end if;

  -- Authorize before resolving a username to prevent unauthorized account enumeration.
  select m.role into v_actor_role
  from teams.memberships m
  join teams.teams t on t.id = m.team_id
  where t.id = p_team_id
    and t.status = 'active'
    and m.user_id = v_actor
    and m.status = 'active';

  if not found then
    raise exception using errcode = '42501', message = 'Active Team membership required';
  end if;
  if v_actor_role not in ('owner', 'admin', 'manager') then
    raise exception using errcode = '42501', message = 'Team invitation permission required';
  end if;
  if v_actor_role = 'manager' and p_role <> 'member' then
    raise exception using errcode = '42501', message = 'Managers may invite members only';
  end if;
  if v_actor_role = 'admin' and p_role = 'admin' then
    raise exception using errcode = '42501', message = 'Only the Team owner may invite an admin';
  end if;

  select t.* into v_team
  from teams.teams t
  where t.id = p_team_id and t.status = 'active';

  select profile.user_id, profile.username
    into v_invitee, v_invitee_username
  from private.user_profiles profile
  where profile.username = lower(btrim(p_username));

  if v_invitee is null then
    raise exception using errcode = '22023', message = 'The specified user was not found or cannot be invited';
  end if;
  if v_invitee = v_actor then
    raise exception using errcode = '22023', message = 'You cannot invite yourself';
  end if;

  select profile.username into v_inviter_username
  from private.user_profiles profile
  where profile.user_id = v_actor;

  if exists (
    select 1 from teams.memberships m
    where m.team_id = p_team_id and m.user_id = v_invitee and m.status = 'active'
  ) then
    raise exception using errcode = '55000', message = 'This user is already a Team member';
  end if;
  if exists (
    select 1 from teams.memberships m
    where m.team_id = p_team_id and m.user_id = v_invitee and m.status = 'suspended'
  ) then
    raise exception using errcode = '55000', message = 'A suspended member must be reinstated before inviting again';
  end if;

  -- Serialize per-actor and per-recipient rate checks in a stable lock order.
  v_lock_actor := pg_catalog.hashtextextended(v_actor::text, 0);
  v_lock_invitee := pg_catalog.hashtextextended(v_invitee::text, 0);
  perform pg_catalog.pg_advisory_xact_lock(least(v_lock_actor, v_lock_invitee));
  if v_lock_actor <> v_lock_invitee then
    perform pg_catalog.pg_advisory_xact_lock(greatest(v_lock_actor, v_lock_invitee));
  end if;

  if (
    select count(*) from teams.invitations i
    where i.invited_by_user_id = v_actor
      and i.created_at >= now() - interval '1 hour'
  ) >= 10 then
    raise exception using errcode = '54000', message = 'Invitation limit reached. Try again later';
  end if;
  if (
    select count(*) from teams.invitations i
    where i.invited_by_user_id = v_actor
      and i.created_at >= now() - interval '24 hours'
  ) >= 30 then
    raise exception using errcode = '54000', message = 'Daily invitation limit reached';
  end if;
  if (
    select count(*) from teams.invitations i
    where i.invitee_user_id = v_invitee
      and i.created_at >= now() - interval '24 hours'
  ) >= 10 then
    raise exception using errcode = '54000', message = 'This account has reached its daily invitation limit';
  end if;
  if exists (
    select 1 from teams.invitations i
    where i.team_id = p_team_id
      and i.invitee_user_id = v_invitee
      and i.created_at >= now() - interval '60 seconds'
  ) then
    raise exception using errcode = '54000', message = 'Wait before resending this invitation';
  end if;

  select * into v_pending
  from teams.invitations i
  where i.team_id = p_team_id
    and i.invitee_user_id = v_invitee
    and i.status = 'pending'
  for update;

  if found then
    update teams.invitations
    set status = 'cancelled',
        cancelled_at = now(),
        responded_at = now()
    where id = v_pending.id;

    update notifications.notifications n
    set resolved_at = coalesce(n.resolved_at, now()),
        read_at = coalesce(n.read_at, now())
    where n.recipient_user_id = v_invitee
      and n.payload ->> 'invitation_id' = v_pending.id::text;

    insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
    values (
      p_team_id, v_actor, 'team.invitation.replaced',
      jsonb_build_object('invitation_id', v_pending.id, 'invitee_user_id', v_invitee)
    );
  end if;

  insert into teams.invitations(
    team_id, invitee_user_id, invited_by_user_id, requested_role, message
  )
  values (p_team_id, v_invitee, v_actor, p_role, v_message)
  returning * into v_invitation;

  insert into notifications.notifications(
    recipient_user_id, actor_user_id, notification_type, title, body, payload
  )
  values (
    v_invitee,
    v_actor,
    'team.invitation',
    'Приглашение в команду',
    '@' || coalesce(v_inviter_username, 'Пользователь') || ' пригласил вас в команду «' || v_team.name || '».',
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'team_id', v_team.id,
      'team_name', v_team.name,
      'inviter_username', v_inviter_username,
      'requested_role', v_invitation.requested_role,
      'message', v_invitation.message,
      'expires_at', v_invitation.expires_at
    )
  );

  insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
  values (
    p_team_id, v_actor, 'team.invitation.created',
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'invitee_user_id', v_invitee,
      'requested_role', v_invitation.requested_role
    )
  );

  return jsonb_build_object(
    'id', v_invitation.id,
    'team_id', v_invitation.team_id,
    'invitee_username', v_invitee_username,
    'requested_role', v_invitation.requested_role,
    'status', v_invitation.status,
    'created_at', v_invitation.created_at,
    'expires_at', v_invitation.expires_at
  );
end;
$function$;

create or replace function teams.team_invitations_list_internal(p_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_items jsonb;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select m.role into v_role
  from teams.memberships m
  join teams.teams t on t.id = m.team_id
  where m.team_id = p_team_id
    and m.user_id = v_actor
    and m.status = 'active'
    and t.status = 'active';

  if v_role not in ('owner', 'admin', 'manager') or v_role is null then
    raise exception using errcode = '42501', message = 'Team invitation permission required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'invitee_username', coalesce(profile.username, 'Пользователь'),
        'requested_role', i.requested_role,
        'message', i.message,
        'status', case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end,
        'created_at', i.created_at,
        'expires_at', i.expires_at
      )
      order by i.created_at desc
    ),
    '[]'::jsonb
  )
  into v_items
  from teams.invitations i
  left join private.user_profiles profile on profile.user_id = i.invitee_user_id
  where i.team_id = p_team_id
    and i.status = 'pending';

  return v_items;
end;
$function$;

create or replace function teams.team_invitation_accept_internal(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_invitation teams.invitations%rowtype;
  v_team_name text;
  v_existing_status text;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select * into v_invitation
  from teams.invitations i
  where i.id = p_invitation_id
  for update;

  if not found or v_invitation.invitee_user_id <> v_actor then
    raise exception using errcode = '42501', message = 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception using errcode = '55000', message = 'Invitation has already been processed';
  end if;

  if v_invitation.expires_at <= now() then
    update teams.invitations
    set status = 'expired', responded_at = now()
    where id = v_invitation.id;

    update notifications.notifications n
    set resolved_at = coalesce(n.resolved_at, now()),
        read_at = coalesce(n.read_at, now())
    where n.recipient_user_id = v_actor
      and n.payload ->> 'invitation_id' = v_invitation.id::text;

    insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
    values (
      v_invitation.team_id, v_actor, 'team.invitation.expired',
      jsonb_build_object('invitation_id', v_invitation.id)
    );

    return jsonb_build_object('id', v_invitation.id, 'status', 'expired');
  end if;

  select t.name into v_team_name
  from teams.teams t
  where t.id = v_invitation.team_id
    and t.status = 'active'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'Team is no longer active';
  end if;

  select m.status into v_existing_status
  from teams.memberships m
  where m.team_id = v_invitation.team_id
    and m.user_id = v_actor
  for update;

  if v_existing_status = 'active' then
    raise exception using errcode = '55000', message = 'You are already a Team member';
  end if;
  if v_existing_status = 'suspended' then
    raise exception using errcode = '42501', message = 'A Team administrator must reinstate your membership first';
  end if;

  insert into teams.memberships(team_id, user_id, role, status)
  values (v_invitation.team_id, v_actor, v_invitation.requested_role, 'active');

  update teams.invitations
  set status = 'accepted', responded_at = now()
  where id = v_invitation.id;

  update notifications.notifications n
  set resolved_at = coalesce(n.resolved_at, now()),
      read_at = coalesce(n.read_at, now())
  where n.recipient_user_id = v_actor
    and n.payload ->> 'invitation_id' = v_invitation.id::text;

  insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
  values
    (
      v_invitation.team_id, v_actor, 'team.invitation.accepted',
      jsonb_build_object('invitation_id', v_invitation.id)
    ),
    (
      v_invitation.team_id, v_actor, 'team.member.joined',
      jsonb_build_object('user_id', v_actor, 'role', v_invitation.requested_role)
    );

  return jsonb_build_object(
    'id', v_invitation.id,
    'team_id', v_invitation.team_id,
    'team_name', v_team_name,
    'status', 'accepted',
    'role', v_invitation.requested_role
  );
end;
$function$;

create or replace function teams.team_invitation_decline_internal(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_invitation teams.invitations%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select * into v_invitation
  from teams.invitations i
  where i.id = p_invitation_id
  for update;

  if not found or v_invitation.invitee_user_id <> v_actor then
    raise exception using errcode = '42501', message = 'Invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception using errcode = '55000', message = 'Invitation has already been processed';
  end if;

  update teams.invitations
  set status = case when expires_at <= now() then 'expired' else 'declined' end,
      responded_at = now()
  where id = v_invitation.id
  returning * into v_invitation;

  update notifications.notifications n
  set resolved_at = coalesce(n.resolved_at, now()),
      read_at = coalesce(n.read_at, now())
  where n.recipient_user_id = v_actor
    and n.payload ->> 'invitation_id' = v_invitation.id::text;

  insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
  values (
    v_invitation.team_id, v_actor,
    case when v_invitation.status = 'expired' then 'team.invitation.expired' else 'team.invitation.declined' end,
    jsonb_build_object('invitation_id', v_invitation.id)
  );

  return jsonb_build_object('id', v_invitation.id, 'status', v_invitation.status);
end;
$function$;

create or replace function teams.team_invitation_cancel_internal(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_invitation teams.invitations%rowtype;
  v_actor_role text;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select * into v_invitation
  from teams.invitations i
  where i.id = p_invitation_id
  for update;

  if not found or v_invitation.status <> 'pending' then
    raise exception using errcode = '55000', message = 'Pending invitation not found';
  end if;

  select m.role into v_actor_role
  from teams.memberships m
  join teams.teams t on t.id = m.team_id
  where m.team_id = v_invitation.team_id
    and m.user_id = v_actor
    and m.status = 'active'
    and t.status = 'active';

  if v_actor_role is null
    or not (
      v_actor_role in ('owner', 'admin')
      or (v_actor_role = 'manager' and v_invitation.invited_by_user_id = v_actor)
    ) then
    raise exception using errcode = '42501', message = 'Invitation cancellation permission required';
  end if;

  update teams.invitations
  set status = 'cancelled', cancelled_at = now(), responded_at = now()
  where id = v_invitation.id;

  update notifications.notifications n
  set resolved_at = coalesce(n.resolved_at, now()),
      read_at = coalesce(n.read_at, now())
  where n.recipient_user_id = v_invitation.invitee_user_id
    and n.payload ->> 'invitation_id' = v_invitation.id::text;

  insert into teams.audit_logs(team_id, actor_user_id, event_code, metadata)
  values (
    v_invitation.team_id, v_actor, 'team.invitation.cancelled',
    jsonb_build_object('invitation_id', v_invitation.id, 'invitee_user_id', v_invitation.invitee_user_id)
  );

  return jsonb_build_object('id', v_invitation.id, 'status', 'cancelled');
end;
$function$;

revoke all on function teams.team_invite_internal(uuid, text, text, text) from public, anon, authenticated;
revoke all on function teams.team_invitations_list_internal(uuid) from public, anon, authenticated;
revoke all on function teams.team_invitation_accept_internal(uuid) from public, anon, authenticated;
revoke all on function teams.team_invitation_decline_internal(uuid) from public, anon, authenticated;
revoke all on function teams.team_invitation_cancel_internal(uuid) from public, anon, authenticated;
grant execute on function teams.team_invite_internal(uuid, text, text, text) to authenticated;
grant execute on function teams.team_invitations_list_internal(uuid) to authenticated;
grant execute on function teams.team_invitation_accept_internal(uuid) to authenticated;
grant execute on function teams.team_invitation_decline_internal(uuid) to authenticated;
grant execute on function teams.team_invitation_cancel_internal(uuid) to authenticated;

create or replace function public.team_invite(
  p_team_id uuid,
  p_username text,
  p_role text default 'member',
  p_message text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select teams.team_invite_internal(p_team_id, p_username, p_role, p_message);
$function$;

create or replace function public.team_invitations_list(p_team_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select teams.team_invitations_list_internal(p_team_id);
$function$;

create or replace function public.team_invitation_accept(p_invitation_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select teams.team_invitation_accept_internal(p_invitation_id);
$function$;

create or replace function public.team_invitation_decline(p_invitation_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select teams.team_invitation_decline_internal(p_invitation_id);
$function$;

create or replace function public.team_invitation_cancel(p_invitation_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select teams.team_invitation_cancel_internal(p_invitation_id);
$function$;

create or replace function public.notifications_list()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select notifications.list_internal();
$function$;

create or replace function public.notification_mark_read(p_notification_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select notifications.mark_read_internal(p_notification_id);
$function$;

revoke all on function public.team_invite(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.team_invitations_list(uuid) from public, anon, authenticated;
revoke all on function public.team_invitation_accept(uuid) from public, anon, authenticated;
revoke all on function public.team_invitation_decline(uuid) from public, anon, authenticated;
revoke all on function public.team_invitation_cancel(uuid) from public, anon, authenticated;
revoke all on function public.notifications_list() from public, anon, authenticated;
revoke all on function public.notification_mark_read(uuid) from public, anon, authenticated;

grant execute on function public.team_invite(uuid, text, text, text) to authenticated;
grant execute on function public.team_invitations_list(uuid) to authenticated;
grant execute on function public.team_invitation_accept(uuid) to authenticated;
grant execute on function public.team_invitation_decline(uuid) to authenticated;
grant execute on function public.team_invitation_cancel(uuid) to authenticated;
grant execute on function public.notifications_list() to authenticated;
grant execute on function public.notification_mark_read(uuid) to authenticated;

commit;
