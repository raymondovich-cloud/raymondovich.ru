-- Version: 1.0.0
-- Return the public biography when loading profile settings.
create or replace function public.profile_settings_get(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'full_name', p.full_name,
    'birth_date', p.birth_date,
    'username', p.username,
    'public_profile_enabled', p.public_profile_enabled,
    'about', p.about,
    'instagram_url', p.instagram_url,
    'youtube_url', p.youtube_url,
    'telegram_url', p.telegram_url,
    'showcase_projects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'name', pr.name,
          'description', pr.description,
          'project_type', pr.project_type
        )
        order by pr.created_at desc, pr.id
      )
      from projects.projects pr
      join projects.project_visibility pv on pv.project_id = pr.id
      where pr.owner_user_id = p.user_id
        and pr.status = 'active'
        and pv.profile_visibility
    ), '[]'::jsonb)
  )
  from private.user_profiles as p
  where p.user_id = p_user_id;
$function$;
