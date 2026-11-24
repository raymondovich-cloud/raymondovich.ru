-- Correct recursive traversal for nested project trees and keep the reminder deadline aligned with the trash hierarchy.
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
          then max(t.archived_at)+interval '30 days' else null end deletion_at
      from roots r join project_tree t on t.root_id=r.id group by r.id,r.owner_user_id,r.name
    ),
    candidates as (
      select 'project'::text object_type,id object_id,owner_user_id,name object_name,deletion_at from project_deadlines
      union all select 'team',t.id,t.owner_user_id,t.name,t.archived_at+interval '30 days'
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
          ||case v_row.milestone when '5_days' then 'через 5 дней.' when '1_day' then 'через 1 день.' else 'через 1 час.' end,
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
      where r.object_type='project'
        and (r.object_id=new.id or r.object_id in(select id from ancestors where status='archived'));
      with recursive ancestors(id,parent_project_id,status) as (
        select p.id,p.parent_project_id,p.status from projects.projects p where p.id=new.id
        union all
        select parent.id,parent.parent_project_id,parent.status from projects.projects parent
        join ancestors child on child.parent_project_id=parent.id
      )
      update notifications.notifications n set resolved_at=coalesce(n.resolved_at,now()),read_at=coalesce(n.read_at,now())
      where n.notification_type='workspace.deletion_reminder'
        and (n.payload->>'object_id'=new.id::text or n.payload->>'object_id' in(select id::text from ancestors where status='archived'))
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
