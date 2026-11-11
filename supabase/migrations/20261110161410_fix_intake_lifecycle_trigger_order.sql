
begin;

create or replace function intake_private.sync_intake_lifecycle_columns()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'notified' then
      new.notification_status := 'sent';
    elsif new.status = 'notify_failed' then
      new.notification_status := 'failed';
    end if;
    if new.status = 'closed' or new.application_status = 'closed' then
      new.application_status := 'closed';
      new.status := 'closed';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'notified' then
      new.notification_status := 'sent';
    elsif new.status = 'notify_failed' then
      new.notification_status := 'failed';
    elsif new.status = 'closed' then
      new.application_status := 'closed';
    end if;
  end if;

  if new.notification_status is distinct from old.notification_status
     and new.application_status <> 'closed' then
    if new.notification_status = 'sent' then
      new.status := 'notified';
    elsif new.notification_status = 'failed' then
      new.status := 'notify_failed';
    elsif new.status in ('notified', 'notify_failed') then
      new.status := 'new';
    end if;
  end if;

  if new.application_status is distinct from old.application_status then
    if new.application_status = 'closed' then
      new.status := 'closed';
    elsif old.application_status = 'closed' and old.status = 'closed' then
      new.status := case
        when new.notification_status = 'sent' then 'notified'
        when new.notification_status = 'failed' then 'notify_failed'
        else 'new'
      end;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.intake_set_closed_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status = 'closed' or new.application_status = 'closed' then
    new.status := 'closed';
    new.application_status := 'closed';
    new.closed_at := coalesce(new.closed_at, now());
    new.retention_expires_at := new.closed_at + interval '90 days';
  else
    new.closed_at := null;
    new.retention_expires_at := null;
  end if;
  return new;
end;
$function$;

drop trigger if exists intake_applications_set_closed_at on public.intake_applications;
drop trigger if exists intake_applications_zz_set_closed_at on public.intake_applications;
create trigger intake_applications_zz_set_closed_at
before insert or update of status, application_status, closed_at
on public.intake_applications
for each row execute function public.intake_set_closed_at();

commit;
