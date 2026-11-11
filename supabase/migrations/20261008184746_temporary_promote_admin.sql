create or replace function public.promote_raymondovich_admin(target_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_id uuid;
begin
  select id into target_id from auth.users where lower(email) = lower(target_email);
  if target_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  where id = target_id;

  return target_id;
end;
$$;
