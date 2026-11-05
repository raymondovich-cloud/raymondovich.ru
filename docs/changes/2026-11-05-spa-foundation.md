# Изменения — 05.11.2026

## Начало технической миграции SPA

В рабочей ветке `architecture/spa-rewrite-2026-11-05` добавлен изолированный технический контур SPA:
- Vue 3;
- Vue Router 5 с Hash History для совместимости с GitHub Pages;
- Vite 8 как build tool;
- единый route registry с маршрутами Public, Owner, Partner и External Project;
- базовые Vue entry point, shell, views и отдельный CSS.

## Важные ограничения

- Существующий `index.html`, legacy HTML entry points, существующие JS-модули и Supabase-конфигурация не заменялись.
- Это foundation/prototype, а не завершённая миграция.
- Owner/Partner/External routes пока являются каркасами и не предоставляют функциональный доступ.
- Авторизация и server-side access control ещё не подключены к Router.
- Старые URL и OAuth/password-reset callback flows ещё не переведены на SPA.
- Package lockfile и runtime build/test пока не подтверждены в этой среде.
- Production, Supabase, DNS, hosting и `main` не изменялись.

## Следующие этапы

1. Проверить доступность и совместимость выбранных версий зависимостей.
2. Настроить локальную сборку и зафиксировать lockfile.
3. Инвентаризировать все legacy routes, styles, scripts и auth callbacks.
4. Перенести Public Space с сохранением содержимого и поведения.
5. Выделить application/domain use cases из legacy Owner Control Center.
6. Перенести auth и callback compatibility без изменения production allow-list.
7. Реализовать и проверить все четыре пространства и authorization boundaries.
8. Провести функциональные, accessibility, responsive и iOS Safari проверки до merge review.
