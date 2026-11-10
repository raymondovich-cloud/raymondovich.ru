create table if not exists public.telegram_admin_sessions (
  telegram_user_id bigint primary key references public.telegram_admins(telegram_user_id) on delete cascade,
  state text not null default 'idle',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.telegram_bot_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by bigint
);

alter table public.telegram_admin_sessions enable row level security;
alter table public.telegram_bot_settings enable row level security;

revoke all on public.telegram_admin_sessions from anon, authenticated;
revoke all on public.telegram_bot_settings from anon, authenticated;
grant all on public.telegram_admin_sessions to service_role;
grant all on public.telegram_bot_settings to service_role;

