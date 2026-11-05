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

## Последующая repository-side migration reconciliation

В рабочей ветке восстановлены четыре migration files, соответствующие версиям live history:
- `20261008184130_create_user_profiles_rls.sql`;
- `20261008184746_temporary_promote_admin.sql`;
- `20261008185014_lock_temporary_admin_function.sql`;
- `20261008195529_create_project_management.sql`.

Migration filename для расширения projects приведён к live version `20261104131912_extend_projects_for_idea_inbox.sql`. Это только изменения repository files. Supabase migration history хранит version/name, а не исходный SQL text, поэтому точное совпадение восстановленных файлов с первоначально применённым SQL не подтверждено. Требуются review SQL и clean isolated staging replay/schema comparison. Ни одна migration не применялась к production.
