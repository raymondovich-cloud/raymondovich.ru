# Сохранение custom domain в Vite artifact

**Дата:** 06.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

## Обнаруженный deployment-риск

В production-ветке GitHub Pages custom domain хранится в корневом файле `CNAME` со значением `raymondovich.ru`. Vite копирует в `dist/` содержимое каталога `public/`, но корневой `CNAME` сам по себе не гарантированно попадает в build artifact.

При переходе на публикацию `dist/` отсутствие `CNAME` в артефакте может привести к потере custom-domain binding после публикации.

## Исправление в migration branch

- Добавлен `public/CNAME` со значением `raymondovich.ru`.
- Build smoke test теперь требует, чтобы `dist/CNAME` совпадал с `public/CNAME`.
- Root `CNAME` сохранён; production Pages configuration не менялась.

## Проверка

Проверка будет выполнена командой `npm run test:build` в CI. До успешного выполнения CI нельзя считать сохранение custom domain подтверждённым.

## Ограничения

DNS, GitHub Pages settings, custom-domain settings и production deployment не изменялись.
