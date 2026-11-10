# Handoff — текущее состояние

> **Проект:** Raymondovich.ru  
> **Документ:** Передача текущего состояния работы  
> **Версия:** 1.6  
> **Статус:** Актуально; Этап 0 утверждён, Этап 1 реализован; Telegram Intake подготовлен в отдельной ветке и fail-closed  
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
- SHA на момент подготовки исходного handoff: `1d01a29a5d5a19942e9d3e0a32ef8f99604ed894`.
- Текущая задача Telegram Intake ведётся в ветке `feature/telegram-intake-2026-11-10`, созданной от `main` SHA `6d122b9ff7a7527f1f4f17228282fae695267795`.
- На момент обновления handoff ветка Intake находится отдельно от `main`; сравнение показывает `ahead`, `behind = 0`. Точный head SHA указан в итоговом отчёте текущей сессии. `main` не изменялся.

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


## 8. Telegram Intake — изолированная реализация

- Созданы спецификация Intake v1.2 и ADR-0004 v1.2.
- Существующий Telegram bootstrap распознаёт разрешённые start_param вида tg, ig, threads, site и кампании с суффиксом _<a-z0-9>{1,24}, направляет их на #apply и очищает launch-параметры из адресной строки. Источник не хранится в hash/localStorage.
- Платформенный bridge расширен методом getTelegramLaunch(). Raw initData передаётся Edge Function для проверки Telegram identity. Для direct-link startapp значение может приходить через tgWebAppStartParam, но не гарантировано в raw signed initData. Сервер предпочитает подписанный start_param, а при его отсутствии принимает allowlisted client hint как неподписанную метку и сохраняет source_param_signed. Это только маркетинговая атрибуция, не доказательство реального канала.
- Добавлены форма, privacy notice draft, route и CSS pattern. Форма не отправляет заявки вне Telegram.
- Fail-closed состояние: data-legal-notice-ready=false скрывает форму и показывает юридический блок; Edge Function дополнительно возвращает 503, если приватный secret INTAKE_ENABLED не равен точной строке true.
- Edge Function intake-submit подготовлена в репозитории, но не развёрнута. Она проверяет HMAC-SHA-256 Telegram initData, свежесть auth_date, Telegram user ID, allowlist source/campaign (signed value preferred, unsigned direct-link hint otherwise), поля, consent, идемпотентность, rate limit, HTML escaping и owner notification.
- Миграция создаёт public.intake_applications, RLS и private owner configuration. Owner ID берётся из единственной Supabase Auth учётной записи с raw_app_meta_data.role=admin; клиент не может передать или подменить owner ID.
- Утверждённый срок хранения: 90 дней после закрытия. Ежедневная очистка через pg_cron; незакрытые заявки остаются до явного закрытия. UI закрытия будет отдельным срезом Owner Control Center.
- Подтверждено read-only: Supabase project yajybgdorhxebbigwjgi активен в eu-central-1 (Frankfurt); существует ровно одна admin Auth учётная запись; pg_cron доступен версии 1.6.4, но ещё не установлен.
- Обнаружено критическое расхождение migration history: в удалённой базе 25 зарегистрированных миграций, в репозитории текущей ветки присутствуют только 4 прежние миграции. До синхронизации истории миграций новую миграцию применять нельзя.
- Production DDL, secrets, Edge Function deploy, DNS и main не изменялись. Текущее состояние существующих Supabase secrets не проверялось; в рамках этой работы секреты не создавались и не менялись. Edge Function не развёрнута.
- Deno отсутствует в текущем runtime: написанные Deno tests не запускались. Реальные Telegram, browser, iPhone Safari и staging tests не проводились.
- Юридическая информация оператора, правовое основание и контактный порядок ещё не утверждены. Отдельно зафиксирован риск 152-ФЗ: если собираются данные граждан РФ, ч. 5 ст. 18 требует проверки первичной локализации, а трансграничная передача в Telegram должна быть отдельно оценена по ст. 12. Supabase сейчас находится во Frankfurt (EU Central). Поэтому публичное включение запрещено до юридической проверки применимости требований и решения по месту первичного хранения.

### Следующие действия для Intake

1. Сверить и восстановить в репозитории отсутствующие migration-файлы/версии до применения новой миграции.
2. Подготовить отдельную staging-среду и проверить миграцию, pg_cron, RLS и Edge Function.
3. Определить юрисдикцию оператора и географию субъектов данных; проверить локализацию по ст. 18(5) 152-ФЗ и трансграничную передачу Telegram по ст. 12; только затем завершить и утвердить уведомление и включать data-legal-notice-ready.
4. После решения по размещению данных и staging настроить TELEGRAM_BOT_TOKEN и OWNER_CHAT_ID как Supabase secrets; INTAKE_ENABLED оставить false до прохождения staging и реальных Telegram тестов.
5. Только после отдельного решения владельца включать API и публиковать ссылки источников.

## История версий

| Версия | Статус | Дата | Изменения |
|---|---|---|---|
| 1.4 | Актуально | 2026-11-10 | Добавлены риск локализации по 152-ФЗ, трансграничная передача Telegram и точное состояние секретов: не проверялись и не менялись. |
| 1.3 | Актуально | 2026-11-10 | Зафиксирован Telegram Intake, fail-closed/legal gate, 90-дневное хранение и блокеры migration drift/staging. |
| 1.2 | Актуально | 2026-11-10 | Обновлены фактические проверки hash bootstrap, статус утверждения и оставшиеся вопросы; добавлена оценка SDK. |
| 1.1 | Актуально | 2026-11-10 | Зафиксировано утверждение владельца и реализация платформенного слоя Этапа 1. |
| 1.0 | Актуально на момент создания | 2026-11-10 | Первичная передача состояния и открытых вопросов по Этапу 0. |
