# Projects: корзина и окончательное удаление

**Дата:** 2026-11-12  
**Ветка:** `feature/projects-trash`  
**Статус:** Миграция применена к основной Supabase БД после явного согласования владельца; приложение остаётся в feature branch.

## Изменения

- Добавлено поле `projects.deleted_at` в миграции `20261112154645_projects_trash.sql`.
- Основной реестр и агрегаты Projects исключают строки с `deleted_at IS NOT NULL`.
- Добавлены repository/application операции: загрузка корзины, перемещение, восстановление и окончательное удаление только из корзины.
- В Project Overview добавлено подтверждаемое действие перемещения проекта в корзину.
- Добавлен экран корзины с датой удаления, восстановлением и отдельным подтверждением окончательного удаления.
- В RLS общая policy Projects разделена на SELECT, INSERT, UPDATE и DELETE. DELETE дополнительно ограничен условием `deleted_at IS NOT NULL`.
- Общие каталоги сервисов и ресурсов не удаляются вместе с отношениями проекта; исходная идея не удаляется.

## Проверенные зависимости БД

Read-only проверка Supabase проекта `yajybgdorhxebbigwjgi` подтвердила:
- project history, milestones, project tool relations и project resource relations используют `ON DELETE CASCADE` от `projects`;
- project tasks удаляются через `ON DELETE CASCADE` от milestones;
- `projects.source_idea_id` использует `ON DELETE SET NULL` со стороны `ideas`;
- текущая policy `admin manages projects` проверяет `app_metadata.role = 'admin'` и `auth.uid() = owner_id`;
- связанные таблицы Projects имеют RLS и текущие grants для authenticated.

Миграция добавила только `projects.deleted_at`, частичный индекс и пересоздала RLS policies таблицы `projects`. Существующие строки не обновлялись и не удалялись. Grants, Auth, другие таблицы, Edge Functions и настройки проекта не менялись.

## Проверки и ограничения

- Код подготовлен в отдельной ветке `feature/projects-trash`.
- Миграция `20261112154645_projects_trash` применена к основной БД `yajybgdorhxebbigwjgi` после согласия владельца.
- Проверены наличие `deleted_at`, частичного индекса и четырёх policies SELECT/INSERT/UPDATE/DELETE.
- Migration history подтверждает запись версии `20261112154645`.
- Поведенческий SQL RLS-тест выполнен в транзакции с `SET LOCAL ROLE authenticated` и тестовыми JWT claims: owner/admin может читать свой проект, перемещать в корзину и восстанавливать; DELETE активного проекта блокируется; не-владелец не может читать/обновлять/удалять строку; окончательное удаление проекта из корзины разрешено.
- Тестовая запись создавалась и удалялась внутри `ROLLBACK`; контрольный запрос после теста подтвердил `3 active / 0 trashed / 3 total`, тестовых строк нет. Реальный вход через пользовательскую Auth-сессию не проверялся.
- В доступной среде отсутствует Supabase CLI, поэтому миграционный файл создан через GitHub repository API с timestamp-именем в принятом формате; команда `supabase migration new` не запускалась.
- Browser/E2E и мобильное визуальное тестирование не выполнены: Cloudflare Pages Preview пропускает `feature/projects-trash` с `skip_reason = branch_config`. Сейчас `preview_deployment_setting = custom`, а allowlist содержит только `ui/design-system-stage-2-final` и `ui/prototype-v3-full-parity`. Настройки Cloudflare не менялись.
- Повторная проверка Supabase Advisors: новых security findings для `projects` нет. Сохраняются общие предупреждения проекта (включая `pg_net` в `public`, отключённую leaked-password protection и таблицы с RLS без policies). Performance Advisor показывает `auth_rls_initplan` для 17 policies, включая Projects; выражения Projects уже используют `(select auth.jwt())` и `(select auth.uid())`, поэтому автоматически переписывать политики без подтверждённой причины не стали.
- GitHub Actions workflow runs для текущего SHA отсутствуют. Cloudflare Preview deployment для текущего SHA создан как skipped из-за branch allowlist. Merge в `main` и Cloudflare Production deploy не выполнялись.

## Следующий безопасный этап

Завершить тестирование приложения и RLS, проверить Preview на мобильных размерах, убедиться, что основной реестр скрывает корзину, восстановление возвращает прежние связи, а окончательное удаление очищает только дочерние данные проекта. Затем обновить PR для review. Merge в `main` и выпуск UI остаются отдельными действиями.
