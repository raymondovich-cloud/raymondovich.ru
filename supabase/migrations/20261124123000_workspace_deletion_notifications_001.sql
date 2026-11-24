-- Workspace deletion reminders and Telegram account linking.
begin;

create table if not exists private.telegram_account_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_user_id bigint not null unique,
  chat_id bigint not null,
  username text,
  linked_at timestamptz not null default now()
);
create table if not exists private.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists telegram_link_tokens_expiry_idx on private.telegram_link_tokens(expires_at);

create table if not exists private.workspace_deletion_reminders (
  id uuid primary key default gen_random_uuid(),
  object_type text not null check (object_type in ('project','team')),
  object_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  object_name text not null,
  deletion_at timestamptz not null,
  milestone text not null check (milestone in ('5_days','1_day','1_hour')),
  scheduled_at timestamptz not null,
  notification_id uuid references notifications.notifications(id) on delete set null,
  telegram_status text not null default 'pending' check (telegram_status in ('pending','sending','sent','failed','skipped','cancelled','expired')),
  telegram_attempts integer not null default 0,
  telegram_sent_at timestamptz,
  telegram_last_error text,
  created_at timestamptz not null default now(),
  unique (object_type, object_id, milestone)
);
create index if not exists workspace_deletion_reminders_delivery_idx
  on private.workspace_deletion_reminders(telegram_status, scheduled_at)
  where telegram_status in ('pending','failed');

create or replace function public.telegram_link_start()
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid(); v_token text;
begin
  if v_user is null then raise exception using errcode='28000', message='Authentication required'; end if;
  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  delete from private.telegram_link_tokens where user_id=v_user or expires_at<=now();
  insert into private.telegram_link_tokens(token,user_id,expires_at) values(v_token,v_user,now()+interval '15 minutes');
  return jsonb_build_object('url','https://t.me/raymondovich_bot?start=link_'||v_token,'expires_at',now()+interval '15 minutes');
end;
$function$;

create or replace function public.telegram_link_status()
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid(); v_link private.telegram_account_links%rowtype;
begin
  if v_user is null then raise exception using errcode='28000', message='Authentication required'; end if;
  select * into v_link from private.telegram_account_links where user_id=v_user;
  if not found then return jsonb_build_object('linked',false); end if;
  return jsonb_build_object('linked',true,'username',v_link.username,'linked_at',v_link.linked_at);
end;
$function$;

create or replace function public.telegram_link_unlink()
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception using errcode='28000', message='Authentication required'; end if;
  delete from private.telegram_account_links where user_id=v_user;
  update private.workspace_deletion_reminders set telegram_status='skipped',telegram_last_error='Telegram account unlinked'
    where owner_user_id=v_user and telegram_status in ('pending','failed','sending');
  delete from private.telegram_link_tokens where user_id=v_user;
  return jsonb_build_object('linked',false);
end;
$function$;

create or replace function public.telegram_link_consume(p_token text,p_telegram_user_id bigint,p_chat_id bigint,p_username text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_link_token private.telegram_link_tokens%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception using errcode='42501', message='Service role required';
  end if;
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

create or replace function public.notifications_worker_authorize(p_token text)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select coalesce(current_setting('request.jwt.claim.role',true)='service_role'
    and exists(select 1 from vault.decrypted_secrets where name='workspace_notification_worker_token' and decrypted_secret=p_token),false);
$function$;

create or replace function public.notifications_telegram_claim(p_limit integer default 20)
returns table(reminder_id uuid,chat_id bigint,object_type text,object_name text,milestone text,deletion_at timestamptz)
language plpgsql security definer set search_path = ''
as $function$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception using errcode='42501', message='Service role required';
  end if;
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
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception using errcode='42501', message='Service role required';
  end if;
  update private.workspace_deletion_reminders
  set telegram_status=case when p_success then 'sent' when telegram_attempts>=5 then 'failed' else 'pending' end,
      telegram_sent_at=case when p_success then now() else telegram_sent_at end,
      telegram_last_error=case when p_success then null else left(coalesce(p_error,'Telegram delivery failed'),1000) end
  where id=p_reminder_id and telegram_status='sending';
  return jsonb_build_object('updated',found);
end;
$function$;

create or replace function private.workspace_deletion_reminders_tick()
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_row record; v_reminder_id uuid; v_notification_id uuid; v_created integer:=0; v_worker_token text;
begin
  if not pg_try_advisory_xact_lock(78123042,31) then return jsonb_build_object('skipped',true,'reason','reminder_tick_already_running'); end if;
  for v_row in
    with recursive roots as (
      select p.id,p.owner_user_id,p.name from projects.projects p
      left join projects.projects parent on parent.id=p.parent_project_id
      where p.status='archived' and p.archived_at is not null
        and (p.parent_project_id is null or parent.status<>'archived')
    ),
    project_tree(root_id,node_id,owner_user_id,status,archived_at) as (
      select r.id,p.id,p.owner_user_id,p.status,p.archived_at from roots r join projects.projects p on p.id=r.id
      union all
      select t.root_id,child.id,child.owner_user_id,child.status,child.archived_at
      from projects.projects child join project_tree t on child.parent_project_id=t.node_id
    ),
    project_deadlines as (
      select r.id,r.owner_user_id,r.name,
        case when coalesce(bool_and(t.owner_user_id=r.owner_user_id and t.status='archived' and t.archived_at is not null),false)
          then max(t.archived_at)+interval '30 days' else null end as deletion_at
      from roots r join project_tree t on t.root_id=r.id group by r.id,r.owner_user_id,r.name
    ),
    candidates as (
      select 'project'::text object_type,id object_id,owner_user_id,name object_name,deletion_at from project_deadlines
      union all
      select 'team',t.id,t.owner_user_id,t.name,t.archived_at+interval '30 days'
      from teams.teams t where t.status='archived' and t.archived_at is not null
    )
    select c.*,
      case when now()>=c.deletion_at-interval '1 hour' then '1_hour'
           when now()>=c.deletion_at-interval '1 day' then '1_day'
           when now()>=c.deletion_at-interval '5 days' then '5_days' end milestone
    from candidates c where c.deletion_at>now() and c.deletion_at<=now()+interval '5 days'
  loop
    if v_row.milestone is null then continue; end if;
    v_reminder_id:=null;
    insert into private.workspace_deletion_reminders(object_type,object_id,owner_user_id,object_name,deletion_at,milestone,scheduled_at)
    values(v_row.object_type,v_row.object_id,v_row.owner_user_id,v_row.object_name,v_row.deletion_at,v_row.milestone,
      case v_row.milestone when '5_days' then v_row.deletion_at-interval '5 days'
        when '1_day' then v_row.deletion_at-interval '1 day' else v_row.deletion_at-interval '1 hour' end)
    on conflict(object_type,object_id,milestone) do nothing returning id into v_reminder_id;
    if v_reminder_id is not null then
      insert into notifications.notifications(recipient_user_id,notification_type,title,body,payload)
      values(v_row.owner_user_id,'workspace.deletion_reminder','Скорое автоматическое удаление',
        case v_row.object_type when 'project' then 'Проект «'||v_row.object_name||'» будет автоматически удалён '
          else 'Команда «'||v_row.object_name||'» будет автоматически удалена ' end
          || case v_row.milestone when '5_days' then 'через 5 дней.' when '1_day' then 'через 1 день.' else 'через 1 час.' end,
        jsonb_build_object('reminder_id',v_reminder_id,'object_type',v_row.object_type,'object_id',v_row.object_id,
          'object_name',v_row.object_name,'milestone',v_row.milestone,'deletion_at',v_row.deletion_at))
      returning id into v_notification_id;
      update private.workspace_deletion_reminders set notification_id=v_notification_id where id=v_reminder_id;
      v_created:=v_created+1;
    end if;
  end loop;
  update private.workspace_deletion_reminders set telegram_status='expired',telegram_last_error='Object deletion deadline has passed'
    where telegram_status in ('pending','failed') and deletion_at<=now();
  select decrypted_secret into v_worker_token from vault.decrypted_secrets where name='workspace_notification_worker_token' limit 1;
  if v_worker_token is not null then
    perform net.http_post(url:='https://yajybgdorhxebbigwjgi.supabase.co/functions/v1/workspace-deletion-notifications',
      headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',v_worker_token),
      body:=jsonb_build_object('source','pg_cron'));
  end if;
  return jsonb_build_object('created_reminders',v_created);
end;
$function$;

create or replace function private.workspace_deletion_reminders_cancel()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if old.status='archived' and new.status='active' then
    if tg_argv[0]='project' then
      with recursive ancestors(id,parent_project_id,status) as (
        select p.id,p.parent_project_id,p.status from projects.projects p where p.id=new.id
        union all
        select parent.id,parent.parent_project_id,parent.status from projects.projects parent
        join ancestors child on child.parent_project_id=parent.id
      )
      update private.workspace_deletion_reminders r set telegram_status='cancelled',telegram_last_error='Project or descendant restored'
      where r.object_type='project' and r.object_id in(select id from ancestors where status='archived');
      with recursive ancestors(id,parent_project_id,status) as (
        select p.id,p.parent_project_id,p.status from projects.projects p where p.id=new.id
        union all
        select parent.id,parent.parent_project_id,parent.status from projects.projects parent
        join ancestors child on child.parent_project_id=parent.id
      )
      update notifications.notifications n set resolved_at=coalesce(n.resolved_at,now()),read_at=coalesce(n.read_at,now())
      where n.notification_type='workspace.deletion_reminder'
        and n.payload->>'object_id' in(select id::text from ancestors where status='archived')
        and n.resolved_at is null;
    else
      update private.workspace_deletion_reminders set telegram_status='cancelled',telegram_last_error='Team restored'
      where object_type='team' and object_id=new.id and telegram_status in ('pending','failed','sending');
      update notifications.notifications set resolved_at=coalesce(resolved_at,now()),read_at=coalesce(read_at,now())
      where notification_type='workspace.deletion_reminder' and payload->>'object_id'=new.id::text and resolved_at is null;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists projects_cancel_deletion_reminders on projects.projects;
create trigger projects_cancel_deletion_reminders after update of status on projects.projects
for each row execute function private.workspace_deletion_reminders_cancel('project');
drop trigger if exists teams_cancel_deletion_reminders on teams.teams;
create trigger teams_cancel_deletion_reminders after update of status on teams.teams
for each row execute function private.workspace_deletion_reminders_cancel('team');

revoke all on function private.workspace_deletion_reminders_tick() from public,anon,authenticated;
revoke all on function private.workspace_deletion_reminders_cancel() from public,anon,authenticated;
revoke all on function public.telegram_link_consume(text,bigint,bigint,text) from public,anon,authenticated;
revoke all on function public.notifications_worker_authorize(text) from public,anon,authenticated;
revoke all on function public.notifications_telegram_claim(integer) from public,anon,authenticated;
revoke all on function public.notifications_telegram_complete(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.telegram_link_start() to authenticated;
grant execute on function public.telegram_link_status() to authenticated;
grant execute on function public.telegram_link_unlink() to authenticated;
grant execute on function public.telegram_link_consume(text,bigint,bigint,text) to service_role;
grant execute on function public.notifications_worker_authorize(text) to service_role;
grant execute on function public.notifications_telegram_claim(integer) to service_role;
grant execute on function public.notifications_telegram_complete(uuid,boolean,text) to service_role;

do $vault$
begin
  if not exists(select 1 from vault.secrets where name='workspace_notification_worker_token') then
    perform vault.create_secret(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
      'workspace_notification_worker_token','Internal authorization token for workspace deletion notification worker');
  end if;
end;
$vault$;

do $schedule$
declare v_job_id bigint;
begin
  for v_job_id in select jobid from cron.job where jobname='workspace-deletion-notification-reminders'
  loop perform cron.unschedule(v_job_id); end loop;
  perform cron.schedule('workspace-deletion-notification-reminders','* * * * *','select private.workspace_deletion_reminders_tick();');
end;
$schedule$;

commit;
