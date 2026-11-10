begin;

alter table public.intake_applications
  add column partner_role text,
  add column weekly_availability text,
  add column portfolio_url text,
  add column product_name text,
  add column product_url text,
  add column product_stage text,
  add column conditional_fields_version smallint not null default 0
    check (conditional_fields_version in (0, 1));

alter table public.intake_applications
  add constraint intake_applications_partner_role_check
    check (partner_role is null or partner_role in ('co_development', 'ecosystem_tools', 'promotion_only')),
  add constraint intake_applications_weekly_availability_check
    check (weekly_availability is null or weekly_availability in ('up_to_5', '5_to_15', 'over_15')),
  add constraint intake_applications_product_stage_check
    check (product_stage is null or product_stage in ('idea', 'in_development', 'launched')),
  add constraint intake_applications_portfolio_url_check
    check (portfolio_url is null or (char_length(portfolio_url) <= 2048 and portfolio_url ~ '^https://[^[:space:]]+$')),
  add constraint intake_applications_product_name_check
    check (product_name is null or char_length(product_name) <= 120),
  add constraint intake_applications_product_url_check
    check (product_url is null or (char_length(product_url) <= 2048 and product_url ~ '^https://[^[:space:]]+$')),
  add constraint intake_applications_conditional_fields_check
    check (
      (
        conditional_fields_version = 0
        and partner_role is null
        and weekly_availability is null
        and portfolio_url is null
        and product_name is null
        and product_url is null
        and product_stage is null
      )
      or (
        conditional_fields_version = 1
        and interest = 'partner'
        and partner_role is not null
        and weekly_availability is not null
        and product_name is null
        and product_url is null
        and product_stage is null
      )
      or (
        conditional_fields_version = 1
        and interest = 'own_product'
        and partner_role is null
        and weekly_availability is null
        and portfolio_url is null
        and product_stage is not null
      )
      or (
        conditional_fields_version = 1
        and interest = 'question'
        and partner_role is null
        and weekly_availability is null
        and portfolio_url is null
        and product_name is null
        and product_url is null
        and product_stage is null
      )
    );

comment on column public.intake_applications.partner_role is
  'Selected role for partner-interest requests only.';
comment on column public.intake_applications.weekly_availability is
  'Selected weekly time commitment for partner-interest requests only.';
comment on column public.intake_applications.portfolio_url is
  'Optional HTTPS portfolio or GitHub URL for partner-interest requests.';
comment on column public.intake_applications.product_name is
  'Optional product name for own-product requests.';
comment on column public.intake_applications.product_url is
  'Optional HTTPS product URL for own-product requests.';
comment on column public.intake_applications.product_stage is
  'Required product stage for own-product requests.';
comment on column public.intake_applications.conditional_fields_version is
  '0 for legacy requests created before conditional questions; 1 for requests validated against the conditional form contract.';

-- Keep the legacy 12-argument RPC overload during the rolling deployment.
-- The currently deployed Edge Function continues using it until the new
-- Edge Function version is deployed. Remove the legacy overload in a later
-- cleanup migration after rollout verification.
create function public.intake_submit(
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
  p_consent_at timestamptz,
  p_partner_role text,
  p_weekly_availability text,
  p_portfolio_url text,
  p_product_name text,
  p_product_url text,
  p_product_stage text
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
    telegram_user_id, telegram_username, language_code, client_platform, consent_at,
    partner_role, weekly_availability, portfolio_url, product_name, product_url, product_stage,
    conditional_fields_version
  ) values (
    v_owner_id, p_idempotency_key, p_source, p_campaign, p_source_param_signed, p_interest, p_name, p_message,
    p_telegram_user_id, p_telegram_username, p_language_code, p_client_platform, p_consent_at,
    p_partner_role, p_weekly_availability, p_portfolio_url, p_product_name, p_product_url, p_product_stage,
    1
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
  uuid, text, text, boolean, text, text, text, bigint, text, text, text, timestamptz,
  text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.intake_submit(
  uuid, text, text, boolean, text, text, text, bigint, text, text, text, timestamptz,
  text, text, text, text, text, text
) to service_role;

commit;
