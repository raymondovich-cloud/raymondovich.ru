# Read-only Supabase schema and security audit

**Дата:** 05.11.2026  
**Проект:** `yajybgdorhxebbigwjgi`  
**Область:** только read-only metadata inspection; production database не изменялась.

## Проверки

- Проверены существование и колонки `public.ideas`, `public.projects`, `public.user_profiles`.
- Проверены RLS flags, policies, table grants и CHECK/FK constraints.
- Получен список live migration history.
- Проверен ACL для privileged function `public.promote_raymondovich_admin(text)`.
- Запущен Supabase Security Advisor (security).

## Результаты

- RLS включён на `ideas`, `projects`, `user_profiles`; owner/admin policies подтверждены live metadata.
- Колонки и ключевые ограничения для ideas/projects согласуются с используемыми Domain/Repository полями.
- На `ideas` у роли `anon` обнаружены избыточные table grants, включая `TRUNCATE`; RLS не защищает TRUNCATE. Требуется отдельное разрешённое security remediation.
- Security Advisor сообщил, что Leaked Password Protection отключена; Auth setting не менялась.
- Live migration history содержит четыре миграции, отсутствующие в репозитории; timestamp migration расширения projects отличается от checked-in файла. Нужна отдельная reconciliation до подтверждения воспроизводимости чистого staging deployment.
- `promote_raymondovich_admin(text)` — SECURITY DEFINER; EXECUTE доступен только `postgres` и `service_role`, не `anon` и не `authenticated`.

## Ограничения

- Не выполнялись INSERT/UPDATE/DELETE/DDL, не менялись grants, RLS, Auth settings или функции.
- Не читались пользовательские строки и персональные данные.
- Isolated Supabase integration/RLS tests с синтетическими identities не запускались.
- Ни одна production настройка не менялась.
