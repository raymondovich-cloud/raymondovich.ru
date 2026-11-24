-- Function EXECUTE privileges are the authorization boundary for service-role-only RPCs.
-- Remove request-claim checks because Supabase secret-key authentication may not populate legacy role GUCs.
create or replace function public.notifications_worker_authorize(p_token text)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from vault.decrypted_secrets
    where name='workspace_notification_worker_token' and decrypted_secret=p_token
  );
$function$;

create or replace function public.telegram_link_consume(p_token text,p_telegram_user_id bigint,p_chat_id bigint,p_username text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_link_token private.telegram_link_tokens%rowtype;
begin
  if p_token is null or p_telegram_user_id is null or p_chat_id is null then
    raise exception using errcode='22023', message='Invalid Telegram link request';
  end if;
  select * into v_link_token from private.telegram_link_tokens
    where token=p_token and expires_at>now() for update;
  if not found then raise exception using errcode='22023', message='Link token is invalid or expired'; end if;
  if exists(select 1 from private.telegram_account_links where telegram_user_id=p_telegram_user_id and user_id<>v_link_token.user_id) then
    raise exception using errcode='23505', message='This Telegram account is already linked to another Raymondovich account';
  end if;
  insert into private.telegram_account_links(user_id,telegram_user_id,chat_id,username)
    values(v_link_token.user_id,p_telegram_user_id,p_chat_id,nullif(p_username,''))
    on conflict(user_id) do update set telegram_user_id=excluded.telegram_user_id,chat_id=excluded.chat_id,username=excluded.username,linked_at=now();
  delete from private.telegram_link_tokens where token=p_token;
  return jsonb_build_object('linked',true);
end;
$function$;

create or replace function public.notifications_telegram_claim(p_limit integer default 20)
returns table(reminder_id uuid,chat_id bigint,object_type text,object_name text,milestone text,deletion_at timestamptz)
language plpgsql security definer set search_path = ''
as $function$
begin
  return query
  with picked as (
    select r.id from private.workspace_deletion_reminders r
    join private.telegram_account_links l on l.user_id=r.owner_user_id
    join public.telegram_bot_users b on b.telegram_user_id=l.telegram_user_id
    where r.telegram_status in ('pending','failed') and r.telegram_attempts<5
      and r.scheduled_at<=now() and r.deletion_at>now()
      and b.is_subscribed=true and b.is_blocked=false
    order by r.scheduled_at,r.created_at
    for update of r skip locked limit greatest(1,least(coalesce(p_limit,20),100))
  ), claimed as (
    update private.workspace_deletion_reminders r
    set telegram_status='sending',telegram_attempts=r.telegram_attempts+1,telegram_last_error=null
    where r.id in(select id from picked) returning r.*
  )
  select c.id,l.chat_id,c.object_type,c.object_name,c.milestone,c.deletion_at
  from claimed c join private.telegram_account_links l on l.user_id=c.owner_user_id;
end;
$function$;

create or replace function public.notifications_telegram_complete(p_reminder_id uuid,p_success boolean,p_error text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
begin
  update private.workspace_deletion_reminders
  set telegram_status=case when p_success then 'sent' when telegram_attempts>=5 then 'failed' else 'pending' end,
      telegram_sent_at=case when p_success then now() else telegram_sent_at end,
      telegram_last_error=case when p_success then null else left(coalesce(p_error,'Telegram delivery failed'),1000) end
  where id=p_reminder_id and telegram_status='sending';
  return jsonb_build_object('updated',found);
end;
$function$;

alter table private.telegram_account_links enable row level security;
alter table private.telegram_link_tokens enable row level security;
alter table private.workspace_deletion_reminders enable row level security;
revoke all on function public.telegram_link_start() from public,anon;
revoke all on function public.telegram_link_status() from public,anon;
revoke all on function public.telegram_link_unlink() from public,anon;
grant execute on function public.telegram_link_start() to authenticated;
grant execute on function public.telegram_link_status() to authenticated;
grant execute on function public.telegram_link_unlink() to authenticated;
