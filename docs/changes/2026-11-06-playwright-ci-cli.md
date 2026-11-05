# Исправление запуска Playwright в CI

**Дата:** 06.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

## Причина изменения

Предыдущий CI подтвердил, что установка зависимостей, 56 модульных тестов, production build и build smoke checks проходят. Первоначальный запуск Playwright через `npx` завершался ошибкой `playwright: not found`.

В следующем запуске #386 прямой вызов CLI через Node.js успешно установил Chromium и WebKit. Однако запуск E2E через `npm run test:e2e` снова завершился ошибкой `sh: 1: playwright: not found`. Таким образом, загрузка браузеров исправлена, но npm script по-прежнему не разрешает бинарную команду Playwright. Точная первопричина отсутствия исполняемой ссылки в PATH не установлена.

## Изменение CI

В `.github/workflows/spa-build-check.yml`:

- сохранена диагностика установленного пакета Playwright, CLI entry point, версий Node/npm, настройки `bin-links` и наличия `node_modules/.bin/playwright`;
- установка браузеров выполняется прямым вызовом: `node ./node_modules/playwright/cli.js install --with-deps chromium webkit`;
- запуск E2E также переведён на прямой вызов установленной CLI-точки входа: `node ./node_modules/playwright/cli.js test`, чтобы не зависеть от поиска бинарной команды через npm PATH.

## Проверка и ограничения

- Новый CI должен подтвердить запуск и фактическое прохождение браузерных E2E-тестов.
- Успешная установка Chromium и WebKit подтверждена в запуске #386; E2E в нём не стартовали.
- `package.json` и `package-lock.json` не изменялись.
- Изменения ограничены CI workflow и этим changelog.
- `main`, production deployment, DNS, Cloudflare, hosting и production Supabase не затрагивались.
