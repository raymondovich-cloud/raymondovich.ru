begin;

create extension if not exists pg_cron;

create schema if not exists intake_private;
revoke all on schema intake_private from public, anon, authenticated;
grant usage on schema intake_private to service_role;

create table if not exists intake_private.intake_owner_config (
  singleton boolean primary key default true check (singleton),
  owner_id uuid not null references auth.users(id) on delete restrict
);
alter table intake_private.intake_owner_config enable row level security;
alter table intake_private.intake_owner_config force row level security;
revoke all on intake_private.intake_owner_config from public, anon, authenticated;
grant select on intake_private.intake_owner_config to service_role;

do $owner$
declare
  v_admin_count integer;
  v_owner_id uuid;
begin
  select count(*)::integer, (array_agg(id order by created_at asc))[1]
    into v_admin_count, v_owner_id
  from auth.users
  where raw_app_meta_data ->> 'role' = 'admin';

  if v_admin_count <> 1 or v_owner_id is null then
    raise exception 'INTAKE_REQUIRES_EXACTLY_ONE_SUPABASE_ADMIN';
  end if;

  insert into intake_private.intake_owner_config (singleton, owner_id)
  values (true, v_owner_id)
  on conflict (singleton) do update set owner_id = excluded.owner_id;
end;
$owner$;

create table if not exists public.intake_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  idempotency_key uuid not null unique,
  source text not null,
  campaign text,
  source_param_signed boolean not null default false,
  interest text not null,
  name text not null,
  message text not null,
  telegram_user_id bigint not null,
  telegram_username text,
  language_code text,
  client_platform text,
  consent_at timestamptz not null,
  status text not null default 'new',
  notify_error text,
  notified_at timestamptz,
  closed_at timestamptz,
  retention_expires_at timestamptz,

  constraint intake_applications_source_check
    check (source in ('tg', 'ig', 'threads', 'site', 'other')),
  constraint intake_applications_campaign_check
    check (
      campaign is null
      or (source <> 'other' and campaign ~ '^[a-z0-9]{1,24}$')
    ),
  constraint intake_applications_interest_check
    check (interest in ('partner', 'own_product', 'question')),
  constraint intake_applications_name_check
    check (char_length(btrim(name)) between 1 and 80),
  constraint intake_applications_message_check
    check (char_length(btrim(message)) between 1 and 1000),
  constraint intake_applications_telegram_user_id_check
    check (telegram_user_id > 0),
  constraint intake_applications_username_check
    check (telegram_username is null or telegram_username ~ '^[A-Za-z0-9_]{5,32}$'),
  constraint intake_applications_language_check
    check (language_code is null or language_code ~ '^[A-Za-z0-9-]{2,16}$'),
  constraint intake_applications_platform_check
    check (client_platform is null or client_platform in (
      'ios', 'android', 'macos', 'tdesktop', 'weba', 'webk', 'unigram', 'unknown'
    )),
  constraint intake_applications_status_check
    check (status in ('new', 'notified', 'notify_failed', 'closed')),
  constraint intake_applications_closed_at_check
    check ((status = 'closed') = (closed_at is not null)),
  constraint intake_applications_notify_error_check
    check (notify_error is null or char_length(notify_error) <= 120)
);

comment on table public.intake_applications is
  'Private intake requests submitted through the Telegram Mini App. Source is an attribution label; it may be an unsigned direct-link hint and is never an authorization signal.';
comment on column public.intake_applications.source_param_signed is
  'True only when the chosen start_param was present in the HMAC-verified initData. False means it was accepted as an unsigned direct-link attribution hint.';
comment on column public.intake_applications.client_platform is
  'Untrusted client-reported Telegram SDK platform hint. Never use for authorization or attribution.';
comment on column public.intake_applications.retention_expires_at is
  'Generated retention deadline: 90 days after the request is closed.';

create index if not exists intake_applications_owner_created_idx
  on public.intake_applications (owner_id, created_at desc);
create index if not exists intake_applications_user_created_idx
  on public.intake_applications (telegram_user_id, created_at desc);
create index if not exists intake_applications_retention_idx
  on public.intake_applications (retention_expires_at)
  where retention_expires_at is not null;
create index if not exists intake_applications_status_created_idx
  on public.intake_applications (status, created_at desc);

alter table public.intake_applications enable row level security;
alter table public.intake_applications force row level security;

create policy "owner reads intake applications"
on public.intake_applications
for select
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and owner_id = (select auth.uid())
);

revoke all on public.intake_applications from anon;
revoke insert, update, delete, truncate, references, trigger on public.intake_applications from authenticated;
grant select on public.intake_applications to authenticated;
grant all on public.intake_applications to service_role;

create or replace function public.intake_submit(
  p_idempotency_key uuid,
  p_source text,
  p_campaign text,
  p_source_param_signed boolean,
  p_interest text,
  p_name text,
  p_message text,
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_language_code text,
  p_client_platform text,
  p_consent_at timestamptz
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
  v_recent_ten_minutes integer;
  v_recent_day integer;
begin
  select owner_id into v_owner_id
  from intake_private.intake_owner_config
  where singleton = true;

  if v_owner_id is null then
    raise exception 'INTAKE_OWNER_NOT_CONFIGURED' using errcode = '55000';
  end if;

  if p_idempotency_key is null
    or p_telegram_user_id is null
    or p_telegram_user_id <= 0
    or p_consent_at is null
    or p_source_param_signed is null
  then
    raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
  end if;

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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_telegram_user_id::text, 0)
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

  select count(*)::integer into v_recent_ten_minutes
  from public.intake_applications
  where telegram_user_id = p_telegram_user_id
    and created_at > now() - interval '10 minutes';

  select count(*)::integer into v_recent_day
  from public.intake_applications
  where telegram_user_id = p_telegram_user_id
    and created_at > now() - interval '24 hours';

  if v_recent_ten_minutes >= 1 or v_recent_day >= 5 then
    raise exception 'INTAKE_RATE_LIMIT' using errcode = 'P0001';
  end if;

  insert into public.intake_applications (
    owner_id, idempotency_key, source, campaign, source_param_signed, interest, name, message,
    telegram_user_id, telegram_username, language_code, client_platform, consent_at
  ) values (
    v_owner_id, p_idempotency_key, p_source, p_campaign, p_source_param_signed, p_interest, p_name, p_message,
    p_telegram_user_id, p_telegram_username, p_language_code, p_client_platform, p_consent_at
  )
  returning * into v_application;

  return jsonb_build_object(
    'application_id', v_application.id,
    'created_at', v_application.created_at,
    'duplicate', false
  );
end;
$function$;

revoke all on function public.intake_submit(
  uuid, text, text, boolean, text, text, text, bigint, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.intake_submit(
  uuid, text, text, boolean, text, text, text, bigint, text, text, text, timestamptz
) to service_role;

create or replace function public.intake_set_closed_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status = 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
    new.retention_expires_at := new.closed_at + interval '90 days';
  else
    new.closed_at := null;
    new.retention_expires_at := null;
  end if;
  return new;
end;
$function$;

revoke all on function public.intake_set_closed_at() from public, anon, authenticated;

drop trigger if exists intake_applications_set_closed_at on public.intake_applications;
create trigger intake_applications_set_closed_at
before insert or update of status, closed_at on public.intake_applications
for each row execute function public.intake_set_closed_at();

do $schedule$
begin
  if not exists (
    select 1 from cron.job where jobname = 'intake-closed-retention-cleanup'
  ) then
    perform cron.schedule(
      'intake-closed-retention-cleanup',
      '0 3 * * *',
      $job$delete from public.intake_applications
           where status = 'closed'
             and retention_expires_at <= now()$job$
    );
  end if;
end;
$schedule$;

commit;
