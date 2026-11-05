# Auth callback PKCE correction and branch reconciliation

**Дата:** 06.11.2026  
**Репозиторий:** `raymondovich-cloud/raymondovich.ru`  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`

## Подтверждённая проблема

При проверке Auth callback обнаружено, что Application service передавал в `supabase.auth.exchangeCodeForSession()` всю строку query-параметров (например, `?code=abc&state=...`), хотя Supabase JS API ожидает только значение authorization code.

Это могло ломать PKCE callback после подтверждения email или другого сценария, возвращающего `code`.

## Исправление

- Application service теперь извлекает значение `code` из `URLSearchParams`.
- В `exchangeCodeForSession()` передаётся только код авторизации.
- Добавлена проверка пустого значения `code`.
- Unit test теперь включает дополнительный параметр `state` и проверяет, что gateway получает только `abc`.

## Проверка источника API-контракта

Официальная документация Supabase описывает вызов `exchangeCodeForSession(code)`, где аргументом является именно authorization code, а не полная query string:
https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/sessions/pkce-flow.mdx

## Reconciliation с main

- Перед обновлением: `main` = `4b2a0ebb15698f30f4f5c14fac3a32b2eb1a6e7b`.
- Перед обновлением: migration branch = `17a507755d223bec8bdb1bba7b965e1c07d9ba55`.
- Между общей базой и `main` обнаружены два документационных коммита: добавление `.gitignore` и changelog Playwright E2E.
- Содержимое `.gitignore` в обеих ветках совпадает побайтно.
- Changelog Playwright E2E перенесён в рабочую ветку без изменения содержания.
- Обновление выполняется только в migration branch; `main` не изменяется.

## CI status

На HEAD `17a507755d223bec8bdb1bba7b965e1c07d9ba55` workflow run `42108070675` оставался в состоянии pending, но GitHub API возвращал `0 jobs` и `0 check runs`. Это не является ни успешным, ни неуспешным выполнением. После обновления ветки требуется новый CI на новом HEAD.

## Границы безопасности

- Production deployment не выполнялся.
- Production Supabase/Auth/RLS/grants не изменялись.
- DNS, Cloudflare и GitHub Pages settings не изменялись.
- PR #3 не сливался.
