alter table public.telegram_publication_deliveries alter column recipient_chat_id type text using recipient_chat_id::text;
