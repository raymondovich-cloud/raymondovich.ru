create table if not exists public.telegram_owner_chat_messages (
    id bigint generated always as identity primary key,
    chat_id bigint not null,
    message_id bigint not null,
    message_date timestamptz not null,
    direction text not null check (direction in ('incoming','outgoing')),
    created_at timestamptz not null default now(),
    unique (chat_id, message_id)
  );
  create index if not exists telegram_owner_chat_messages_chat_date_idx
    on public.telegram_owner_chat_messages (chat_id, message_date desc);
  alter table public.telegram_owner_chat_messages enable row level security;
  revoke all on table public.telegram_owner_chat_messages from anon, authenticated;
  grant all on table public.telegram_owner_chat_messages to service_role;
