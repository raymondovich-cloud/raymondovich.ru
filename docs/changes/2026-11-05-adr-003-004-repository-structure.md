# Changelog: ADR-003, ADR-004 и целевая структура репозитория

**Дата:** 05.11.2026  
**Рабочая ветка:** architecture/spa-rewrite-2026-11-05

## Добавленные документы

- docs/architecture/decisions/adr-003-state-management.md
- docs/architecture/decisions/adr-004-testing-strategy.md
- docs/architecture/final-repository-structure.md

## ADR-003 — State Management

Предварительно рекомендован Pinia 4.x при условии утверждения Vue 3. Область применения ограничена действительно общим application/session state. URL state остаётся у Router; module state — внутри модуля; ephemeral UI state — локально; постоянные бизнес-данные — на сервере. Не допускается превращать Pinia в универсальное хранилище всех данных или механизм авторизации.

## ADR-004 — Testing Strategy

Предварительно рекомендованы Vitest + Vue Test Utils для unit/component/application tests, Playwright для browser E2E, isolated Supabase environment для database/RLS integration и обязательная проверка критических сценариев на реальном iOS Safari. Точные версии, CI и ресурсы не создавались.

## Final Repository Structure

Описано целевое распределение ответственности между app, functional modules, core, shared infrastructure, Design System, tests, Supabase and docs. Дерево концептуальное; пустые каталоги и будущие модули не создаются. Физический перенос разрешён только после review ADRs, inventory mapping и отдельного одобрения.

## Границы изменений

- Изменены только архитектурные документы и changelog в рабочей ветке.
- Прикладной код, package manifests, lockfiles, build/test config, CI workflows, SQL migrations and runtime files не изменялись.
- main, backup branch and raymondovich.online не затрагивались.
- Production Supabase/Auth/data/RLS/grants/Edge Functions, DNS, Cloudflare, GitHub Pages and hosting не изменялись.
- Не выполнялись package installation, migrations, browser tests or deployment.
