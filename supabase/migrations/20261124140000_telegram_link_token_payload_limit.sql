-- Telegram deep-link payloads are limited to 64 characters.
-- The "link_" prefix uses 5 characters, so the token must use at most 59.
create or replace function public.telegram_link_start()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_token text;
begin
  if v_user is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  v_token := pg_catalog.substr(
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') ||
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
    1,
    59
  );

  delete from private.telegram_link_tokens
  where user_id = v_user or expires_at <= now();

  insert into private.telegram_link_tokens(token, user_id, expires_at)
  values (v_token, v_user, now() + interval '15 minutes');

  return jsonb_build_object(
    'url', 'https://t.me/raymondovich_bot?start=link_' || v_token,
    'expires_at', now() + interval '15 minutes'
  );
end;
$function$;
