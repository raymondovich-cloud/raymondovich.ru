# Changelog: ADR-004 Testing Strategy

**Дата:** 05.11.2026  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**ADR:** `docs/architecture/decisions/adr-004-testing-strategy.md`

## Зафиксировано
- Определены unit, component, application/integration, router, E2E, architecture, database/migration, performance и security test layers.
- Указаны условные кандидаты Vitest, Vue Test Utils, Playwright, axe-core и isolated Supabase test environment.
- Зафиксировано, что Playwright WebKit не заменяет проверку реального iOS Safari.
- Определены CI quality gates, требования к synthetic test identities, изоляции backend и отсутствию production data в тестах.

## Статус
ADR остаётся PROPOSED. Test runner, CI workflow, test project и deployment pipeline не создавались.

## Границы
Изменён только архитектурный документ и данный changelog в рабочей ветке. main, backup, production Supabase и raymondovich.online не затронуты.
