# Read-only Supabase schema and security audit

**Дата:** 05.11.2026  
**Проект:** `yajybgdorhxebbigwjgi`  
**Область:** read-only metadata inspection; production database не изменялась.

## Проверки

- Проверены таблицы, колонки, constraints, indexes, RLS flags, policies и table grants.
- Получен список `supabase_migrations.schema_migrations`, включая сохранённые SQL `statements`.
- Проверен ACL для `public.promote_raymondovich_admin(text)`.
- Проверены public functions, доступные для EXECUTE роли `anon`.
- Запущен Supabase Security Advisor (security).

## Подтверждённое состояние

- RLS включён на `public.ideas`, `public.projects`, `public.user_profiles`; FORCE RLS выключен.
- `ideas`: admin policy требует JWT `app_metadata.role = 'admin'` и `auth.uid() = owner_id`.
- `projects`: live admin policy использует те же admin/owner predicates.
- `user_profiles`: policies ограничивают INSERT/SELECT/UPDATE собственным `user_id = auth.uid()`.
- `projects` grants: authenticated CRUD; anon grants не обнаружены.
- `ideas` grants: у anon обнаружены SELECT/INSERT/UPDATE/DELETE, TRUNCATE, TRIGGER и REFERENCES. Отсутствие anon RLS policy блокирует обычный row access, но RLS не защищает TRUNCATE. Нужна отдельная разрешённая security remediation.
- `public.promote_raymondovich_admin(text)` — SECURITY DEFINER; EXECUTE разрешён service_role, запрещён anon/authenticated. Других public functions, доступных anon для EXECUTE, проверка не обнаружила.
- Security Advisor сообщил, что Leaked Password Protection отключена; Auth setting не менялась.
- В проверенной public schema не обнаружены таблицы, содержащие в имени `partner`, `external`, `member` или `workspace`.

## Repository-side migration reconciliation

Первоначальная сверка обнаружила четыре live migration versions, отсутствовавшие в repository, и неправильный filename для project extension migration.

В migration branch:
- восстановлены `20261008184130_create_user_profiles_rls.sql`, `20261008184746_temporary_promote_admin.sql`, `20261008185014_lock_temporary_admin_function.sql`, `20261008195529_create_project_management.sql` из сохранённых в live ledger SQL statements;
- project extension migration приведена к live version `20261104131912_extend_projects_for_idea_inbox.sql`;
- все 14 repository migration files сравнены с `supabase_migrations.schema_migrations.statements`: filenames/versions/names совпадают, SQL statement content differences — **0**.

Это repository-only восстановление источника миграций. Ни одна migration не применялась к production. Clean local Supabase replay ещё не выполнялся: seed migrations требуют изолированных fixtures с admin owner и проектом LifeGame.

## Ограничения

- Не выполнялись INSERT/UPDATE/DELETE/DDL; не менялись grants, RLS, Auth settings или функции.
- Не читались пользовательские строки и персональные данные.
- Isolated Supabase integration/RLS tests с синтетическими identities не запускались.
- Migration replay, schema diff и migration fixture setup остаются отдельным quality gate.
