# Projects: корзина и окончательное удаление

**Дата:** 2026-11-11  
**Ветка:** `feature/projects-trash`  
**Статус:** Реализация подготовлена в feature branch; staging/production migration не применялась.

## Изменения

- Добавлено поле `projects.deleted_at` в миграции `20261111174600_projects_trash.sql`.
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

Никакие DDL, данные, RLS policies, grants или настройки production Supabase не менялись.

## Проверки и ограничения

- Код и миграция подготовлены в отдельной ветке.
- Полноценные browser/E2E и SQL RLS tests пока не выполнены.
- В доступной среде отсутствует Supabase CLI, поэтому миграционный файл создан через GitHub repository API с timestamp-именем в принятом формате; команда `supabase migration new` не запускалась.
- У проекта не подтверждена отдельная staging Supabase database для применения миграции. До проверки миграции нельзя сливать ветку в `main`: текущий код ожидает колонку `deleted_at`.
- Production merge/deploy и применение migration не выполнялись.

## Следующий безопасный этап

Поднять/подтвердить изолированную staging database, применить миграцию там, выполнить проверки RLS и пользовательские сценарии, проверить Preview. После этого подготовить PR к review. Production release требует отдельного согласования владельца.
