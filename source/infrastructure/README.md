<!-- version 1.1 -->
# Infrastructure

Реализации внешних зависимостей: API, GitHub, Supabase, хранилища и другие интеграции.

- Supabase client находится в `source/infrastructure/supabase/client.js`.
- Auth gateways и data repositories изолируют SDK-specific запросы.
- Infrastructure не содержит пользовательских экранов и не определяет бизнес-политику.
- Изменения production schema, RLS, grants, Edge Functions и credentials требуют отдельного разрешения.
