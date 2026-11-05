# Расширение браузерных проверок Owner Control Center и Auth

**Дата:** 05.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

## Проверка package manifest и lockfile

- Сверены `package.json` и `package-lock.json`.
- Root dependencies, devDependencies, engines и package manager согласованы.
- Lockfile содержит точные package entries для `@playwright/test@1.64.1`, `playwright@1.64.1` и `playwright-core@1.64.1`.
- На текущем проверенном состоянии нет оснований пересоздавать или вручную редактировать lockfile.
- Воспроизводимость установки должна быть подтверждена новым CI `npm ci` на точном HEAD.

## CI

- `.github/workflows/spa-build-check.yml` уже устанавливает Chromium и WebKit и запускает `npm run test:e2e`.
- E2E не требовалось подключать к workflow повторно; недостатком была узкая тестовая матрица.
- Workflow ограничен migration branch и не содержит deployment шагов.

## Добавлена браузерная матрица

`tests/e2e/public-and-routing.e2e.js` расширен сценариями:

- неавторизованный посетитель перенаправляется на login при входе в Owner Control Center;
- авторизованный пользователь без admin role не получает доступ к Owner Control Center;
- admin session открывает Owner Control Center и раздел Ideas;
- login отображает нормализованную ошибку неверных credentials;
- password reset отправляет запрос и показывает privacy-preserving подтверждение;
- registration view отображает обязательные поля.

Для сценариев Owner используются синтетическая локальная Supabase session и перехват запросов к данным. Production Supabase и реальные аккаунты не используются.

## Ограничения

- Эти браузерные тесты проверяют frontend routing/UI и взаимодействие с mocked Supabase HTTP responses; они не подтверждают реальные Auth email delivery, callback allow-list, JWT signature validation, RLS или DB authorization.
- WebKit iPhone project — эмуляция браузерного движка/viewport, не реальное устройство iOS Safari.
- Нужен успешный CI на точном финальном HEAD; до его завершения результат считается непроверенным.
- Partner Workspace и External Project Workspace остаются неоперациональными заглушками и не должны считаться готовыми к публикации.

## Безопасность изменений

Изменения ограничены E2E tests и changelog в migration branch. `main`, production deployment, DNS, Cloudflare, hosting и production Supabase не изменялись.

## Дополнительная проверка перехвата password reset

При сверке Playwright route handler с Supabase Auth flow обнаружено, что запрос восстановления пароля может содержать query-параметр `redirect_to`. Точный matcher `/auth/v1/recover` не гарантировал перехват URL с query string. Matcher расширен до `/auth/v1/recover**`, чтобы E2E тест проверял именно мокированный ответ, а не пытался обратиться к внешнему Auth endpoint.

Это исправление внесено в `tests/e2e/public-and-routing.e2e.js`. Требуется повторный полный CI на новом HEAD; результат браузерного теста пока не подтверждён.
