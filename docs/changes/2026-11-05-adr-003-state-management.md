# Changelog: ADR-003 State Management

**Дата:** 05.11.2026  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**ADR:** `docs/architecture/decisions/adr-003-state-management.md`

## Зафиксировано
- Подготовлен анализ ответственности client/application/server state.
- Рекомендация Pinia 4.x условна и зависит от утверждения Vue 3 в ADR-002.
- URL state остаётся в Router; module state принадлежит модулю; ephemeral UI state — компоненту; persistent business data — backend.
- Определены требования к очистке user/project-scoped state при logout, account switch и смене project context.
- Отдельная query/cache library не утверждена.

## Статус
ADR остаётся PROPOSED. Никакие пакеты не установлены, state store не внедрён, код и persistence не изменялись.

## Границы
Изменён только архитектурный документ и данный changelog в рабочей ветке. main, backup, production Supabase и raymondovich.online не затронуты.
