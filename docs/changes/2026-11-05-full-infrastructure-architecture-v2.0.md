# Changelog: консолидация полной инфраструктурной архитектуры Raymondovich.ru

**Дата:** 05.11.2026  
**Рабочая ветка:** architecture/spa-rewrite-2026-11-05  
**Основной документ:** docs/architecture/spa-rewrite-specification.md  
**Новая редакция:** draft 2.0

## Что сделано

Основная спецификация расширена до единого архитектурного документа, описывающего не только переход MPA → SPA, но и полную целевую инфраструктуру платформы.

Добавлены разделы:
- архитектурные уровни и системные границы;
- backend, API contracts, серверная авторизация, транзакции и фоновые задачи;
- Identity, account, participation types, permissions и space switching;
- security controls, secrets и environment configuration;
- data ownership, database conventions, storage, cache и data lifecycle;
- паспорта внешних интеграций;
- Local/Development, Staging, Production, build/release pipeline и rollback;
- observability, error/incident history, notifications, audit, health checks и operational modes;
- backup, disaster recovery, RPO/RTO и restore procedure;
- performance/scalability objectives;
- test layers and quality gates;
- privacy, data classification and retention;
- register of unresolved decisions, ADR sequence, document completion criteria and source precedence.

Ранее согласованные требования и решения по четырём пространствам, Modular Monolith, Clean Architecture, DDD, state ownership, error isolation, notifications, audit, backups, security, caching, scaling и repository boundaries сохранены в основной спецификации.

## Статус технологических решений

- ADR-001 Hosting & Routing остаётся PROPOSED; Cloudflare Pages — рекомендованный кандидат, но не выбранное production-решение.
- ADR-002 Frontend Stack, ADR-003 State Management и ADR-004 Testing Strategy остаются следующими документальными этапами.
- Конкретные framework, bundler, state library и test runner не утверждены.
- Production schema/RLS/grants, runtime hosting behavior, RPO/RTO и SLO не объявляются проверенными или установленными без соответствующего аудита.

## Согласованность документации

В docs/architecture/target-architecture.md добавлено явное уведомление, что прежняя MPA-модель маршрутизации superseded новой SPA-спецификацией. Файл сохранён как исторический источник ранних архитектурных принципов.

## Границы изменений

- Изменены только архитектурные документы и changelog в рабочей ветке architecture/spa-rewrite-2026-11-05.
- Прикладные HTML/CSS/JS, SQL migrations, тесты и runtime configuration не изменялись.
- main и backup/pre-spa-rewrite-2026-11-05 не изменялись.
- raymondovich.online не затрагивался.
- Production Supabase/Auth/data/RLS/grants/Edge Functions, DNS, Cloudflare, GitHub Pages и hosting не изменялись.
- Не выполнялись deployment, migrations, browser/runtime tests или production connectivity checks.

## Следующий этап

Завершить ADR-001 review и последовательно подготовить ADR-002 Frontend Stack, ADR-003 State Management, ADR-004 Testing Strategy, затем зафиксировать окончательное физическое дерево репозитория. До отдельного разрешения владельца прикладная SPA-реализация не начинается.
