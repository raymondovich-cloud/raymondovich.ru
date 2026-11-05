# Исправление проверки legacy routing

**Дата:** 05.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

- Исправлен тест query/hash preservation: проверяется обычный legacy SPA handoff, а не Auth callback bridge.
- Generic redirect helper теперь переносит legacy query string внутрь query части Vue Router route и сохраняет вложенный anchor fragment; это позволяет `route.query` получать параметры старых URL.
- `spa.html` compatibility handoff сохраняет исходный SPA hash и внешний query string.
- PKCE callback и implicit token-fragment recovery остаются отдельными legacy bridges; их параметры не обрабатываются generic redirect helper.
- CI run `42103202430`: 48 тестов прошли; `npm ci`, production build и built-output smoke checks также успешны.
