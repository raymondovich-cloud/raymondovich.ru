-- Profile settings RPCs: callable only by the trusted profile Edge Function.
create or replace function public.profile_settings_get(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'full_name', p.full_name,
    'birth_date', p.birth_date,
    'username', p.username
  )
  from private.user_profiles as p
  where p.user_id = p_user_id;
$$;

create or replace function public.profile_settings_update(
  p_user_id uuid,
  p_full_name text default null,
  p_birth_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  updated_profile jsonb;
begin
  if p_user_id is null then
    raise exception 'User identifier is required';
  end if;

  if p_full_name is null and p_birth_date is null then
    raise exception 'No profile fields supplied';
  end if;

  if p_full_name is not null then
    normalized_name := btrim(regexp_replace(p_full_name, '\s+', ' ', 'g'));
    if char_length(normalized_name) < 3 or char_length(normalized_name) > 160 then
      raise exception 'Full name must contain between 3 and 160 characters';
    end if;
  end if;

  if p_birth_date is not null and p_birth_date > current_date then
    raise exception 'Birth date cannot be in the future';
  end if;

  update private.user_profiles as p
  set
    full_name = coalesce(normalized_name, p.full_name),
    birth_date = coalesce(p_birth_date, p.birth_date),
    updated_at = now()
  where p.user_id = p_user_id
  returning jsonb_build_object(
    'full_name', p.full_name,
    'birth_date', p.birth_date,
    'username', p.username
  ) into updated_profile;

  if updated_profile is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.profile_settings_get(uuid) from public, anon, authenticated;
revoke all on function public.profile_settings_update(uuid, text, date) from public, anon, authenticated;
grant execute on function public.profile_settings_get(uuid) to service_role;
grant execute on function public.profile_settings_update(uuid, text, date) to service_role;
