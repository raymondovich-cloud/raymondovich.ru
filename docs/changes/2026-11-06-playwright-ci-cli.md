# Исправление запуска Playwright в CI

**Дата:** 06.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

## Причина изменения

Повторный CI на HEAD `fe288c1b432ad277bc471e086354cf715e766bd9` успешно выполнил установку зависимостей, 56 модульных тестов, production build и build smoke checks. Шаг установки браузеров завершился ошибкой `sh: 1: playwright: not found`; E2E-тесты были пропущены.

В логах подтверждено, что `@playwright/test@1.64.1` установлен. Точная первопричина отсутствия команды `playwright` в PATH не была доказана, поэтому изменение не приписывает проблему флагу `--ignore-scripts` или настройкам npm без подтверждения.

## Изменение CI

В `.github/workflows/spa-build-check.yml`:

- добавлена предварительная проверка установленного пакета Playwright, его CLI entry point, версии Node/npm и настройки `bin-links`;
- добавлена диагностическая отметка о наличии или отсутствии `node_modules/.bin/playwright`;
- установка браузеров теперь запускает установленную CLI-точку входа напрямую: `node ./node_modules/playwright/cli.js install --with-deps chromium webkit`. Это обходит разрешение исполняемой команды через `npx`, которое завершилось ошибкой в предыдущем запуске.

## Проверка и ограничения

- Изменение ожидает нового CI на обновлённом HEAD.
- Успешная установка браузеров и запуск E2E пока не подтверждены.
- `package.json` и `package-lock.json` не изменялись.
- Изменения ограничены CI workflow и этим changelog.
- `main`, production deployment, DNS, Cloudflare, hosting и production Supabase не затрагивались.
