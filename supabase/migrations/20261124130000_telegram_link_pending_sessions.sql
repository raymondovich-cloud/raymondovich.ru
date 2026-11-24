-- Telegram link handoff between the required /start deep-link step and /integration command.
create table if not exists public.telegram_link_pending (
  telegram_user_id bigint primary key,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.telegram_link_pending enable row level security;
revoke all on table public.telegram_link_pending from anon, authenticated;
grant all on table public.telegram_link_pending to service_role;

create index if not exists telegram_link_pending_expires_at_idx
  on public.telegram_link_pending (expires_at);
