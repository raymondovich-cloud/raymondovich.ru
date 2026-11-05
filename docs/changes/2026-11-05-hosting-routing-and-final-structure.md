# Changelog: временный hosting/routing и финальная карта репозитория

**Дата:** 05.11.2026  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**Основные документы:**
- `docs/architecture/spa-rewrite-specification.md`
- `docs/architecture/decisions/adr-001-hosting-and-routing.md`
- `docs/architecture/final-repository-structure.md`

## Что зафиксировано

- По прямому решению владельца GitHub Pages + Hash Router используется как временная среда разработки и тестирования SPA.
- Production hosting не выбран; Cloudflare Pages остаётся кандидатом для будущей оценки, а не утверждённой платформой.
- Подчёркнуто, что GitHub Pages — статический hosting и не является security boundary; backend authorization и Supabase RLS остаются обязательными.
- Основная спецификация обновлена с учётом временного routing решения и статуса production hosting.
- Подготовлена расширенная карта целевой структуры репозитория: четыре workspace, app composition, domain/application/infrastructure, feature modules, Design System, tests, configuration, deployment boundaries, migration mapping и unresolved decisions.
- Сохранена текущая корневая конвенция `source/` вместо необоснованного rename в `src/`; миграция каталогов не выполнялась.
- Framework-specific choices и tooling явно обозначены как условные, поскольку ADR-002–004 не утверждены.

## Что не выполнялось

- Не устанавливались пакеты и не создавались runtime/build/CI конфигурации.
- Не менялись GitHub Pages settings, DNS, Cloudflare, Supabase, Auth, schema, RLS, grants или Edge Functions.
- Не выполнялись deployment, migrations или production connectivity tests.
- Не изменялись `main`, backup branch и `raymondovich.online`.

## Статус

Документальный пакет готов к комплексному review владельцем. Это не разрешение на прикладную реализацию или production migration.
