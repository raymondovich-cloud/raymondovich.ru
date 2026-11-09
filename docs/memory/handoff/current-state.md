# Handoff — текущее состояние

> **Проект:** Raymondovich.ru  
> **Документ:** Передача текущего состояния работы  
> **Версия:** 1.2  
> **Статус:** Актуально; Этап 0 утверждён, Этап 1 реализован в отдельной ветке  
> **Дата:** 2026-11-10

---

## 1. Git-состояние

- Репозиторий: `raymondovich-cloud/raymondovich.ru`
- Базовая ветка: `main`
- Базовый SHA: `b57447ab6c5a0f15f562bde3f9a2d522e6aa6bb6`
- Рабочая ветка: `architecture/multi-platform-stage-0-2026-11-10`
- Коммит документации Этапа 0: `2476866bc114125976921e2b078a0b634030f054`.
- Кодовый коммит Этапа 1: `d52a601904dae827979c8c3ede9b188e9cfdea0f`.
- Commit с оценкой внешнего SDK: `1d01a29a5d5a19942e9d3e0a32ef8f99604ed894`.
- SHA на момент подготовки handoff: `1d01a29a5d5a19942e9d3e0a32ef8f99604ed894`.

## 2. Выполнено в анализе

- Прочитан `docs/development.rules/agent.md`, включая архитектурные принципы, Design System, безопасность, процесс согласования, версионирование, handoff, внешние зависимости и формат отчёта.
- Изучены `docs/architecture/core-interaction-architecture.md` (в т.ч. модульный монолит, перечень модулей и §13 Memory).
- Изучен `docs/architecture/public-space-v1-technical-baseline.md` v1.2: подтверждены конфликт scope backend/Supabase и противоречие SPA vs multi-page в §9.
- Изучен `docs/architecture/navigation-history-architecture.md`.
- Подтверждены по коду: index.html как единственная точка входа, hash routing, Supabase JS esm.sh `@2`, текущие URL/key, PKCE/persistSession/detectSessionInUrl, текущий auth redirect, навигационный API и события, sessionStorage для PIN unlock, localStorage для темы.
- Подтверждено наличие `CNAME` со значением `raymondovich.ru`.
- Последний известный commit main на момент анализа: `b57447ab6c5a0f15f562bde3f9a2d522e6aa6bb6`.
- Создана отдельная ветка для документационного этапа.

## 3. Сделано в Этапе 0

- Подготовлена межплатформенная архитектура v1.1 со статусом «Утверждён»; владелец утвердил решения 2026-11-10.
- Подготовлен черновик Memory System Architecture v0.1.
- Подготовлены README, три ADR и handoff в `docs/memory/`; ADR-0001/0002/0003 утверждены владельцем.
- Подготовлена запись в журнал изменений за 2026-11-10.
- Код, DDL, RLS, Edge Functions, DNS, домен и deployment configuration не менялись.

## 4. Не выполнено / не проверено

- Не проверялись реальные desktop browser, iPhone Safari, Telegram Mini App и iOS устройство.
- Эмуляция Telegram hash в V8 harness выполнена: fake hash очищен до пустого маршрута; startParam `projects` преобразован в `#authorization/projects`; обычный Web не загружал SDK в mocked loader. Реальный браузерный тест не выполнялся.
- Не проверена фактическая загрузка Telegram SDK в Network tab реального браузера.
- GitHub Pages settings не удалось подтвердить через доступный read-only интерфейс; наличие workflow в `.github/workflows/` также не подтверждено. Нужна проверка GitHub Settings → Pages и Actions владельцем/в последующей сессии.
- Не проверялись текущие фактические лимиты в Dashboard конкретного Supabase проекта; использованы официальные публичные тарифные документы на дату редакции.
- Не проверялся реальный Telegram auth/session exchange; он только спроектирован.
- Не выполнялись production запросы, DDL, секреты, deploy или DNS операции.

## 5. Решения владельца и оставшиеся вопросы

**Решения Этапа 0 утверждены 2026-11-10:** этапность платформ, local bundle как будущий iOS-вариант по умолчанию, серверные бизнес-контракты, platform bridge, Telegram auth model, безопасная привязка, запрет admin по Telegram, модель хранения и репозиторная Memory.

Остаются вопросы/проверки до следующих этапов:

1. Выполнить регрессионный прогон Web в desktop browser и iPhone Safari.
2. Проверить Telegram SDK, BackButton, тему и safe-area на реальном Telegram device.
3. Подтвердить GitHub Pages source/workflow и Actions настройки; в доступном дереве `.github/` не найден.
4. Перед Telegram Auth отдельно определить точное окно свежести `auth_date`, replay protection, конфликты и отзыв привязки.
5. Перед изменением зависимости отдельно принять решение о pin/vendor стратегии `supabase-js`; на Этапе 1 диапазон `@2` сохранён.
6. Этап 2 (PWA manifest, иконки, service worker ADR и build script) требует отдельного подтверждения владельца.

## 6. Этап 1 — реализовано

- Владелец утвердил все 10 решений Этапа 0.
- Создан `source/config/app-config.js`; публичные Supabase URL и publishable key сохранены без изменения значений.
- Созданы `source/platform/detect.js`, `bootstrap.js`, `bridge.js` и Telegram adapter.
- Bootstrap выполняется до navigation/router, загружает Telegram SDK только при Telegram detection и очищает launch-параметры до маршрутизации.
- Добавлены startParam allowlist: projects, ideas, authorization, home.
- Web redirect URL формируется из SITE_URL и остаётся `https://raymondovich.ru/#authorization`.
- Сохранены существующие Supabase storage keys и PKCE options.
- Добавлены safe-area/viewport tokens и Telegram theme mapping; iOS adapter не создавался.
- Статические синтаксические проверки JS и баланс CSS-блоков прошли. Browser, iPhone Safari и Telegram device не проверялись.

## 7. Осталось

- Реальный Web regression run и визуальная проверка desktop/iPhone Safari.
- Проверка Telegram SDK и BackButton на устройстве.
- Проверка фактических GitHub Pages workflow/settings; в доступном дереве `.github/` не обнаружен.
- Отдельное утверждение Этапа 2.
- Не менять Supabase DDL, RLS, production secrets, DNS, домен и deploy.

## История версий

| Версия | Статус | Дата | Изменения |
|---|---|---|---|
| 1.2 | Актуально | 2026-11-10 | Обновлены фактические проверки hash bootstrap, статус утверждения и оставшиеся вопросы; добавлена оценка SDK. |
| 1.1 | Актуально | 2026-11-10 | Зафиксировано утверждение владельца и реализация платформенного слоя Этапа 1. |
| 1.0 | Актуально на момент создания | 2026-11-10 | Первичная передача состояния и открытых вопросов по Этапу 0. |
