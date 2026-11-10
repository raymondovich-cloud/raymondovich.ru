create table if not exists public.user_pin_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  pin_salt text not null,
  hash_iterations integer not null default 600000 check (hash_iterations >= 600000),
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_verified_at timestamptz
);

alter table public.user_pin_credentials enable row level security;
revoke all on table public.user_pin_credentials from public, anon, authenticated;
grant all on table public.user_pin_credentials to service_role;

create or replace function public.pin_record_failure(
  p_user_id uuid,
  p_max_attempts integer default 5,
  p_lock_seconds integer default 900
)
returns table(failed_attempts integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  update public.user_pin_credentials as credentials
  set
    failed_attempts = case
      when credentials.locked_until is not null and credentials.locked_until <= pg_catalog.now() then 1
      else credentials.failed_attempts + 1
    end,
    locked_until = case
      when (
        case
          when credentials.locked_until is not null and credentials.locked_until <= pg_catalog.now() then 1
          else credentials.failed_attempts + 1
        end
      ) >= greatest(p_max_attempts, 1)
      then pg_catalog.now() + pg_catalog.make_interval(secs => greatest(p_lock_seconds, 1))
      else null
    end,
    updated_at = pg_catalog.now()
  where credentials.user_id = p_user_id
  returning credentials.failed_attempts, credentials.locked_until;
end;
$$;

create or replace function public.pin_clear_failures(p_user_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.user_pin_credentials
  set failed_attempts = 0,
      locked_until = null,
      last_verified_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where user_id = p_user_id;
$$;

revoke all on function public.pin_record_failure(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.pin_clear_failures(uuid) from public, anon, authenticated;
grant execute on function public.pin_record_failure(uuid, integer, integer) to service_role;
grant execute on function public.pin_clear_failures(uuid) to service_role;

