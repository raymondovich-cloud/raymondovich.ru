
begin;

alter table public.intake_applications
  alter column telegram_user_id drop not null;

alter table public.intake_applications
  drop constraint if exists intake_applications_telegram_user_id_check;

alter table public.intake_applications
  drop constraint if exists intake_applications_source_check;

alter table public.intake_applications
  add constraint intake_applications_source_check
  check (source ~ '^[a-z0-9][a-z0-9_-]{0,31}$');

alter table public.intake_applications
  add column if not exists request_channel text not null default 'telegram',
  add column if not exists application_status text not null default 'new',
  add column if not exists notification_status text not null default 'pending',
  add column if not exists consent_notice_version text,
  add column if not exists first_touch jsonb,
  add column if not exists last_touch jsonb;

alter table public.intake_applications
  add constraint intake_applications_request_channel_check
    check (request_channel in ('telegram', 'website')),
  add constraint intake_applications_application_status_check
    check (application_status in ('new', 'in_review', 'approved', 'rejected', 'closed')),
  add constraint intake_applications_notification_status_check
    check (notification_status in ('pending', 'sent', 'failed')),
  add constraint intake_applications_notice_version_check
    check (consent_notice_version is null or char_length(consent_notice_version) between 1 and 80),
  add constraint intake_applications_first_touch_object_check
    check (first_touch is null or jsonb_typeof(first_touch) = 'object'),
  add constraint intake_applications_last_touch_object_check
    check (last_touch is null or jsonb_typeof(last_touch) = 'object');

update public.intake_applications
set
  application_status = case when status = 'closed' then 'closed' else 'new' end,
  notification_status = case
    when status = 'notified' then 'sent'
    when status = 'notify_failed' then 'failed'
    else 'pending'
  end,
  request_channel = 'telegram';

create index if not exists intake_applications_channel_created_idx
  on public.intake_applications (request_channel, created_at desc);

create index if not exists intake_applications_application_status_created_idx
  on public.intake_applications (application_status, created_at desc);

create schema if not exists intake_private;
revoke all on schema intake_private from public, anon, authenticated;
grant usage on schema intake_private to service_role;

create table if not exists intake_private.intake_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique
    references public.intake_applications(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intake_notification_outbox_error_length_check
    check (last_error_code is null or char_length(last_error_code) <= 80)
);

alter table intake_private.intake_notification_outbox enable row level security;
alter table intake_private.intake_notification_outbox force row level security;
revoke all on intake_private.intake_notification_outbox from public, anon, authenticated;
grant select, insert, update, delete on intake_private.intake_notification_outbox to service_role;

create index if not exists intake_notification_outbox_due_idx
  on intake_private.intake_notification_outbox (next_attempt_at, created_at)
  where status in ('pending', 'failed');

create table if not exists intake_private.intake_application_status_history (
  id bigint generated always as identity primary key,
  application_id uuid not null
    references public.intake_applications(id) on delete cascade,
  previous_status text,
  new_status text not null
    check (new_status in ('new', 'in_review', 'approved', 'rejected', 'closed')),
  changed_at timestamptz not null default now()
);

alter table intake_private.intake_application_status_history enable row level security;
alter table intake_private.intake_application_status_history force row level security;
revoke all on intake_private.intake_application_status_history from public, anon, authenticated;
grant select, insert on intake_private.intake_application_status_history to service_role;

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
    if new.status = 'closed' then
      new.application_status := 'closed';
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

  if new.notification_status is distinct from old.notification_status then
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
    elsif old.application_status = 'closed' and new.status = 'closed' then
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

revoke all on function intake_private.sync_intake_lifecycle_columns() from public, anon, authenticated;

drop trigger if exists intake_applications_sync_lifecycle on public.intake_applications;
create trigger intake_applications_sync_lifecycle
before insert or update of status, application_status, notification_status
on public.intake_applications
for each row execute function intake_private.sync_intake_lifecycle_columns();

create or replace function intake_private.record_intake_application_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    insert into intake_private.intake_application_status_history
      (application_id, previous_status, new_status)
    values (new.id, null, new.application_status);
  elsif new.application_status is distinct from old.application_status then
    insert into intake_private.intake_application_status_history
      (application_id, previous_status, new_status)
    values (new.id, old.application_status, new.application_status);
  end if;
  return new;
end;
$function$;

revoke all on function intake_private.record_intake_application_status() from public, anon, authenticated;

drop trigger if exists intake_applications_record_status on public.intake_applications;
create trigger intake_applications_record_status
after insert or update of application_status
on public.intake_applications
for each row execute function intake_private.record_intake_application_status();

create or replace function public.intake_submit_website(
  p_idempotency_key uuid,
  p_source text,
  p_interest text,
  p_name text,
  p_message text,
  p_consent_at timestamptz,
  p_consent_notice_version text,
  p_first_touch jsonb,
  p_last_touch jsonb,
  p_partner_role text default null,
  p_weekly_availability text default null,
  p_portfolio_url text default null,
  p_product_name text default null,
  p_product_url text default null,
  p_product_stage text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_existing public.intake_applications%rowtype;
  v_application public.intake_applications%rowtype;
  v_owner_id uuid;
begin
  if p_idempotency_key is null
    or p_consent_at is null
    or p_consent_notice_version is null
    or char_length(p_consent_notice_version) not between 1 and 80
    or p_source is null
    or p_source !~ '^[a-z0-9][a-z0-9_-]{0,31}$'
    or p_first_touch is not null and jsonb_typeof(p_first_touch) <> 'object'
    or p_last_touch is not null and jsonb_typeof(p_last_touch) <> 'object'
  then
    raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
  end if;

  if p_interest = 'partner' then
    if p_partner_role not in ('co_development', 'ecosystem_tools', 'promotion_only')
      or p_weekly_availability not in ('up_to_5', '5_to_15', 'over_15')
      or p_product_name is not null or p_product_url is not null or p_product_stage is not null
    then
      raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
    end if;
  elsif p_interest = 'own_product' then
    if p_partner_role is not null or p_weekly_availability is not null or p_portfolio_url is not null
      or p_product_stage not in ('idea', 'in_development', 'launched')
    then
      raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
    end if;
  elsif p_interest = 'question' then
    if p_partner_role is not null or p_weekly_availability is not null or p_portfolio_url is not null
      or p_product_name is not null or p_product_url is not null or p_product_stage is not null
    then
      raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
    end if;
  else
    raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
  end if;

  select owner_id into v_owner_id
  from intake_private.intake_owner_config
  where singleton = true;

  if v_owner_id is null then
    raise exception 'INTAKE_OWNER_NOT_CONFIGURED' using errcode = '55000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::text, 0)
  );

  select * into v_existing
  from public.intake_applications
  where idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'application_id', v_existing.id,
      'created_at', v_existing.created_at,
      'duplicate', true
    );
  end if;

  insert into public.intake_applications (
    owner_id, idempotency_key, source, campaign, source_param_signed,
    interest, name, message, telegram_user_id, telegram_username,
    language_code, client_platform, consent_at,
    partner_role, weekly_availability, portfolio_url, product_name,
    product_url, product_stage, conditional_fields_version,
    request_channel, application_status, notification_status,
    consent_notice_version, first_touch, last_touch
  ) values (
    v_owner_id, p_idempotency_key, p_source, null, false,
    p_interest, p_name, p_message, null, null,
    null, 'unknown', p_consent_at,
    p_partner_role, p_weekly_availability, p_portfolio_url, p_product_name,
    p_product_url, p_product_stage, 1,
    'website', 'new', 'pending',
    p_consent_notice_version, p_first_touch, p_last_touch
  )
  returning * into v_application;

  insert into intake_private.intake_notification_outbox (application_id)
  values (v_application.id);

  return jsonb_build_object(
    'application_id', v_application.id,
    'created_at', v_application.created_at,
    'duplicate', false
  );
end;
$function$;

revoke all on function public.intake_submit_website(
  uuid, text, text, text, text, timestamptz, text, jsonb, jsonb,
  text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.intake_submit_website(
  uuid, text, text, text, text, timestamptz, text, jsonb, jsonb,
  text, text, text, text, text, text
) to service_role;

commit;
