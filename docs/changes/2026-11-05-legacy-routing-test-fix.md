# Исправление проверки legacy routing

**Дата:** 05.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

- Исправлен тест query/hash preservation: проверяется обычный legacy SPA handoff, а не Auth callback bridge.
- PKCE callback остаётся отдельным legacy bridge; параметры callback не должны переноситься в hash-router URL этим generic redirect helper.
- Production код redirect helper не менялся в рамках исправления теста.
- Проверка должна завершиться через CI на актуальном HEAD.
