create table public.telegram_bot_users (
  telegram_user_id bigint primary key,
  chat_id bigint not null unique,
  username text,
  first_name text,
  last_name text,
  is_blocked boolean not null default false,
  started_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.telegram_admins (
  telegram_user_id bigint primary key,
  role text not null check (role in ('owner', 'publications_admin')),
  created_by bigint,
  created_at timestamptz not null default now()
);

create table public.telegram_updates (
  update_id bigint primary key,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create table public.telegram_publications (
  id uuid primary key default gen_random_uuid(),
  created_by bigint not null,
  body text not null default '',
  media jsonb not null default '[]'::jsonb,
  targets text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'completed', 'partial', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (targets <@ array['users','channel','group']::text[])
);

create table public.telegram_publication_deliveries (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.telegram_publications(id) on delete cascade,
  target_type text not null check (target_type in ('user','channel','group')),
  recipient_chat_id bigint not null,
  status text not null default 'pending'
    check (status in ('pending','sent','failed','skipped')),
  telegram_message_id bigint,
  error_code text,
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (publication_id, target_type, recipient_chat_id)
);

create index telegram_bot_users_active_idx
  on public.telegram_bot_users (last_interaction_at desc)
  where is_blocked = false;
create index telegram_publications_created_idx
  on public.telegram_publications (created_at desc);
create index telegram_deliveries_pending_idx
  on public.telegram_publication_deliveries (publication_id, status);
create index telegram_deliveries_status_idx
  on public.telegram_publication_deliveries (status, created_at);

-- SECURITY NOTE:
-- The applied remote migration contained a hard-coded Telegram user identifier.
-- It is intentionally not reproduced in this public repository.
-- Provision the owner row through a private operator-only step before enabling
-- Telegram publication administration in a fresh environment.

alter table public.telegram_bot_users enable row level security;
alter table public.telegram_admins enable row level security;
alter table public.telegram_updates enable row level security;
alter table public.telegram_publications enable row level security;
alter table public.telegram_publication_deliveries enable row level security;

revoke all on public.telegram_bot_users from anon, authenticated;
revoke all on public.telegram_admins from anon, authenticated;
revoke all on public.telegram_updates from anon, authenticated;
revoke all on public.telegram_publications from anon, authenticated;
revoke all on public.telegram_publication_deliveries from anon, authenticated;

grant all on public.telegram_bot_users to service_role;
grant all on public.telegram_admins to service_role;
grant all on public.telegram_updates to service_role;
grant all on public.telegram_publications to service_role;
grant all on public.telegram_publication_deliveries to service_role;

