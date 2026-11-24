-- Recalculate reminder ownership when a restored project splits an archived hierarchy.
create or replace function private.workspace_deletion_reminders_cancel()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if tg_argv[0]='project' then
    if old.status='archived' and new.status='active' then
      with recursive ancestors(id,parent_project_id,status) as (
        select p.id,p.parent_project_id,p.status from projects.projects p where p.id=new.id
        union all
        select parent.id,parent.parent_project_id,parent.status from projects.projects parent
        join ancestors child on child.parent_project_id=parent.id
      )
      update private.workspace_deletion_reminders r
      set telegram_status='cancelled',telegram_last_error='Project or descendant restored'
      where r.object_type='project'
        and (r.object_id=new.id or r.object_id in(select id from ancestors where status='archived'))
        and r.telegram_status in ('pending','failed','sending');

      with recursive ancestors(id,parent_project_id,status) as (
        select p.id,p.parent_project_id,p.status from projects.projects p where p.id=new.id
        union all
        select parent.id,parent.parent_project_id,parent.status from projects.projects parent
        join ancestors child on child.parent_project_id=parent.id
      )
      update notifications.notifications n
      set resolved_at=coalesce(n.resolved_at,now()),read_at=coalesce(n.read_at,now())
      where n.notification_type='workspace.deletion_reminder'
        and (n.payload->>'object_id'=new.id::text or n.payload->>'object_id' in(select id::text from ancestors where status='archived'))
        and n.resolved_at is null;

      with recursive descendants(id) as (
        select new.id
        union all
        select child.id from projects.projects child
        join descendants parent on child.parent_project_id=parent.id
      )
      update notifications.notifications n
      set resolved_at=coalesce(n.resolved_at,now()),read_at=coalesce(n.read_at,now())
      where n.notification_type='workspace.deletion_reminder'
        and n.payload->>'object_id' in(select id::text from descendants where id<>new.id)
        and n.resolved_at is null;

      with recursive descendants(id) as (
        select new.id
        union all
        select child.id from projects.projects child
        join descendants parent on child.parent_project_id=parent.id
      )
      delete from private.workspace_deletion_reminders r
      where r.object_type='project'
        and r.object_id in(select id from descendants where id<>new.id);

    elsif old.status='active' and new.status='archived' then
      with recursive related_ancestors(id,parent_project_id,status) as (
        select p.id,p.parent_project_id,p.status from projects.projects p where p.id=new.id
        union all
        select parent.id,parent.parent_project_id,parent.status from projects.projects parent
        join related_ancestors child on child.parent_project_id=parent.id
      )
      update notifications.notifications n
      set resolved_at=coalesce(n.resolved_at,now()),read_at=coalesce(n.read_at,now())
      where n.notification_type='workspace.deletion_reminder'
        and n.payload->>'object_id' in (
          select id::text from related_ancestors where id=new.id or status='archived'
        )
        and n.resolved_at is null;

      with recursive related_ancestors(id,parent_project_id,status) as (
        select p.id,p.parent_project_id,p.status from projects.projects p where p.id=new.id
        union all
        select parent.id,parent.parent_project_id,parent.status from projects.projects parent
        join related_ancestors child on child.parent_project_id=parent.id
      )
      delete from private.workspace_deletion_reminders r
      where r.object_type='project'
        and r.object_id in(select id from related_ancestors where id=new.id or status='archived');

      with recursive descendants(id) as (
        select new.id
        union all
        select child.id from projects.projects child
        join descendants parent on child.parent_project_id=parent.id
      )
      update private.workspace_deletion_reminders r
      set telegram_status='cancelled',telegram_last_error='Archived parent now controls hierarchy retention'
      where r.object_type='project'
        and r.object_id in(select id from descendants where id<>new.id)
        and r.telegram_status in ('pending','failed','sending');

      with recursive descendants(id) as (
        select new.id
        union all
        select child.id from projects.projects child
        join descendants parent on child.parent_project_id=parent.id
      )
      update notifications.notifications n
      set resolved_at=coalesce(n.resolved_at,now()),read_at=coalesce(n.read_at,now())
      where n.notification_type='workspace.deletion_reminder'
        and n.payload->>'object_id' in(select id::text from descendants where id<>new.id)
        and n.resolved_at is null;
    end if;
  else
    if old.status='archived' and new.status='active' then
      update private.workspace_deletion_reminders
      set telegram_status='cancelled',telegram_last_error='Team restored'
      where object_type='team' and object_id=new.id
        and telegram_status in ('pending','failed','sending');
      update notifications.notifications
      set resolved_at=coalesce(resolved_at,now()),read_at=coalesce(read_at,now())
      where notification_type='workspace.deletion_reminder'
        and payload->>'object_id'=new.id::text and resolved_at is null;
    elsif old.status='active' and new.status='archived' then
      update notifications.notifications
      set resolved_at=coalesce(resolved_at,now()),read_at=coalesce(read_at,now())
      where notification_type='workspace.deletion_reminder'
        and payload->>'object_id'=new.id::text and resolved_at is null;
      delete from private.workspace_deletion_reminders
      where object_type='team' and object_id=new.id;
    end if;
  end if;
  return new;
end;
$function$;

create index if not exists telegram_link_tokens_user_id_idx
  on private.telegram_link_tokens(user_id);
create index if not exists workspace_deletion_reminders_owner_user_id_idx
  on private.workspace_deletion_reminders(owner_user_id);
create index if not exists workspace_deletion_reminders_notification_id_idx
  on private.workspace_deletion_reminders(notification_id);
