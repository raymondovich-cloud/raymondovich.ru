# Изменения — 05.11.2026

## Owner Control Center: функциональная карта

Создан документ `docs/architecture/owner-control-center-functional-map-2026-11-05.md`.

Зафиксировано:
- фактическая экранная модель Owner Control Center: Overview, Ideas, Projects;
- все обнаруженные операции с идеями и проектами, включая создание, редактирование, запуск, статусы, приоритет, архив, восстановление, закрепление и удаление;
- текущие account/session controls, dialogs, responsive sidebar и touch long-press interactions;
- разрыв между внутренней навигацией текущего интерфейса и целевым единым Router;
- application use cases и выявленные нарушения Clean Architecture: прямой импорт Supabase в application services;
- риски частичного выполнения при запуске идеи в проект и удалении проекта;
- подтверждённая RLS policy для `ideas` и отсутствие достаточных данных в repository migrations для сертификации RLS/grants таблицы `projects`;
- legacy auth URLs и redirect compatibility requirements;
- список функциональных parity checks для будущей SPA миграции.

## Проверка

- Документ создан в ветке `architecture/spa-rewrite-2026-11-05`.
- Выполнен fetch-back; SHA файла подтверждён.
- Анализ статический; runtime-тесты не выполнялись.
- Production Supabase/Auth, DNS, hosting и deployment не изменялись.
- Прикладная SPA-реализация не начиналась: ADR-002 (frontend stack) остаётся PROPOSED и требует решения владельца.
