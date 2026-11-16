-- Version: 1.0.0
-- Add a short public biography and expose the account registration date.

begin;
alter table private.user_profiles add column if not exists about text;
alter table private.user_profiles drop constraint if exists user_profiles_about_length_check;
alter table private.user_profiles add constraint user_profiles_about_length_check check (about is null or char_length(about) <= 80);

create or replace function public.profile_public_info_update(
  p_user_id uuid, p_enabled boolean, p_instagram_url text, p_youtube_url text,
  p_telegram_url text, p_about text, p_project_ids uuid[] default '{}'::uuid[]
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_project_ids uuid[] := coalesce(p_project_ids, '{}'::uuid[]); v_count integer;
begin
  if p_user_id is null or p_enabled is null then raise exception using errcode = '22023', message = 'Profile identifier and visibility setting are required'; end if;
  if p_about is not null and char_length(p_about) > 80 then raise exception using errcode = '22023', message = 'About text must be 80 characters or fewer'; end if;
  if cardinality(v_project_ids) > 12 then raise exception using errcode = '22023', message = 'At most 12 showcase projects can be selected'; end if;
  if cardinality(v_project_ids) <> (select count(distinct selected.id)::integer from unnest(v_project_ids) as selected(id)) then raise exception using errcode = '22023', message = 'Duplicate showcase project identifiers are not allowed'; end if;
  if p_instagram_url is not null and (char_length(p_instagram_url) > 2048 or p_instagram_url !~ '^https://(www\.)?instagram\.com/[A-Za-z0-9._-]+/?$') then raise exception using errcode = '22023', message = 'Invalid Instagram URL'; end if;
  if p_youtube_url is not null and (char_length(p_youtube_url) > 2048 or p_youtube_url !~ '^https://(www\.)?(youtube\.com/(channel|c|user|@)[^[:space:]]*|youtu\.be/[^[:space:]]+)$') then raise exception using errcode = '22023', message = 'Invalid YouTube URL'; end if;
  if p_telegram_url is not null and (char_length(p_telegram_url) > 2048 or p_telegram_url !~ '^https://(t\.me|telegram\.me)/[A-Za-z0-9_+/?=-]+$') then raise exception using errcode = '22023', message = 'Invalid Telegram URL'; end if;
  select count(*)::integer into v_count from projects.projects pr where pr.id = any(v_project_ids) and pr.owner_user_id = p_user_id and pr.status = 'active';
  if v_count <> cardinality(v_project_ids) then raise exception using errcode = '42501', message = 'Only active projects owned by this user can be showcased'; end if;
  update private.user_profiles set public_profile_enabled = p_enabled, about = nullif(btrim(p_about), ''), instagram_url = nullif(btrim(p_instagram_url), ''), youtube_url = nullif(btrim(p_youtube_url), ''), telegram_url = nullif(btrim(p_telegram_url), ''), updated_at = now() where user_id = p_user_id;
  if not found then raise exception using errcode = 'P0002', message = 'Profile not found'; end if;
  update projects.project_visibility pv set profile_visibility = (pr.id = any(v_project_ids)), updated_at = now() from projects.projects pr where pv.project_id = pr.id and pr.owner_user_id = p_user_id and pr.status = 'active';
  return public.profile_settings_get(p_user_id);
end;
$function$;

revoke all on function public.profile_public_info_update(uuid, boolean, text, text, text, text, uuid[]) from public, anon, authenticated;
grant execute on function public.profile_public_info_update(uuid, boolean, text, text, text, text, uuid[]) to service_role;

create or replace function public.profile_public_get(p_username text)
returns jsonb language sql stable security definer set search_path = ''
as $function$
  select case when p.public_profile_enabled then jsonb_build_object(
    'profile', jsonb_build_object(
      'full_name', p.full_name, 'username', p.username, 'about', p.about,
      'registered_at', u.created_at, 'instagram_url', p.instagram_url,
      'youtube_url', p.youtube_url, 'telegram_url', p.telegram_url,
      'projects', coalesce((
        select jsonb_agg(jsonb_build_object('name', pr.name, 'description', pr.description) order by pr.created_at desc, pr.id)
        from projects.projects pr join projects.project_visibility pv on pv.project_id = pr.id
        where pr.owner_user_id = p.user_id and pr.status = 'active' and pv.profile_visibility
      ), '[]'::jsonb)
    )
  ) else null end
  from private.user_profiles p join auth.users u on u.id = p.user_id
  where lower(p.username) = lower(btrim(p_username)) limit 1;
$function$;
revoke all on function public.profile_public_get(text) from public, anon, authenticated;
grant execute on function public.profile_public_get(text) to anon, authenticated, service_role;
commit;