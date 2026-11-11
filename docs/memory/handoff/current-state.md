# Handoff — текущее состояние

> **Проект:** Raymondovich.ru  
> **Документ:** Передача текущего состояния работы  
> **Версия:** 2.0  
> **Статус:** Telegram Intake расширен в Production и остаётся fail-closed; UI и документация расширения находятся в PR #20  
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
- Ветка Intake остаётся отдельной от `main`; последнее сравнение: `ahead`, `behind = 0`. `main` не изменялся. Актуальный HEAD доступен в GitHub по ссылке на ветку.

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
- Migration history reconciliation завершена на уровне набора версий: все 25 уже применённых remote migration versions представлены в текущей ветке; дополнительная миграция Intake остаётся локальной и не применённой. Одна историческая Telegram seed-операция намеренно исключена из публичного исходника из-за встроенного персонального Telegram ID; подробности и ограничения приведены ниже.
- Production DDL, secrets, Edge Function deploy, DNS и main не изменялись. Текущее состояние существующих Supabase secrets не проверялось; в рамках этой работы секреты не создавались и не менялись. Edge Function не развёрнута.
- Deno отсутствует в текущем runtime: написанные Deno tests не запускались. Реальные Telegram, browser, iPhone Safari и staging tests не проводились.
- Юридическая информация оператора, правовое основание и контактный порядок ещё не утверждены. Отдельно зафиксирован риск 152-ФЗ: если собираются данные граждан РФ, ч. 5 ст. 18 требует проверки первичной локализации, а трансграничная передача в Telegram должна быть отдельно оценена по ст. 12. Supabase сейчас находится во Frankfurt (EU Central). Поэтому публичное включение запрещено до юридической проверки применимости требований и решения по месту первичного хранения.

### Migration history reconciliation — выполнено 2026-11-10

- Целевой проект подтверждён read-only: Supabase project `raymondovich`, ref `yajybgdorhxebbigwjgi`, регион `eu-central-1` (Frankfurt), статус `ACTIVE_HEALTHY`.
- В удалённой таблице `supabase_migrations.schema_migrations` зарегистрировано 25 версий от `20261008184130` до `20261110055215`.
- В рабочую ветку восстановлены 21 отсутствовавший migration source из массива `statements` удалённой истории Supabase. Четыре ранее существовавших файла сохранены; файл `20261108123542_ideas_categories_activity_and_lifecycle.sql` синхронизирован с фактически применённым SQL из remote history.
- Повторная сверка списка версий: отсутствующих remote versions — 0; локальная дополнительная версия — только `20261110170000_create_intake_applications.sql`, она не зарегистрирована в production и не применялась.
- Исключение безопасности: историческая версия `20261110025001_telegram_publications_core` содержала INSERT с жёстко записанным Telegram user ID. Поскольку репозиторий публичный, числовой идентификатор не перенесён в файл. Таблицы, индексы, RLS и grants восстановлены; seed владельца заменён комментарием. Поэтому этот один файл намеренно не является побайтной копией remote statement. Для чистой staging-среды владелец Telegram publications должен быть добавлен отдельной приватной operator-only операцией до включения административных функций.
- Все остальные восстановленные исходники созданы из SQL statements, сохранённых Supabase migration history. Сверка четырёх прежних файлов показала, что три совпадают с remote SQL после нормализации пробелов; четвёртый обновлён до remote SQL. Один файл имеет только форматное отличие без изменения SQL-содержания.
- Проверки выполнялись read-only через Supabase migration history и GitHub branch contents. Никакой DDL, DML, `db push`, `apply_migration`, deploy, secret change или production mutation не выполнялись.
- Ветка остаётся отдельной; `main` не менялся.

### Staging preflight — дополнительная проверка 2026-11-10

- Повторно прочитан актуальный HEAD ветки после восстановления migration sources; текущий commit на момент проверки — `8c5929a493678fd4012b80533b052945de15d131`.
- Статическая проверка Deno test source выявила отсутствующий импорт `normalizeText` в `intake_test.ts`, хотя функция используется в тесте. Импорт добавлен отдельным коммитом `8c5929a493678fd4012b80533b052945de15d131`.
- Deno runtime по-прежнему недоступен; исправление импорта не считать результатом запуска тестов. Deno tests остаются неисполненными.
- Список Supabase projects проверен read-only. Существующий `Ai-Sistem-Staging` (`cjsgtpxsmlyzitxbbznv`) неактивен и не выбран для Intake. Новый staging project ещё не создан.
- В организации обнаружена одна доступная организация: `fumlzfwzffhxbyplwchp` (`fumlzfwzffhxbyplwchp`). Создание нового Supabase project требует явного выбора организации владельцем; регион для staging предлагается `eu-central-1` (Frankfurt), чтобы совпадал с текущим target environment. До подтверждения проект не создаётся.
- Production project `yajybgdorhxebbigwjgi` остаётся read-only; миграции, secrets, Edge Functions и настройки не менялись.

### Следующие действия для Intake

1. Выполнено: source migration history сверена по всем 25 remote versions. Сохранить приватный шаг provisioning Telegram publications owner для чистой staging-среды.
2. Подготовить отдельную staging-среду и проверить миграцию Intake, pg_cron, RLS и Edge Function. Не использовать существующий неактивный проект Ai-Sistem-Staging без отдельного решения владельца.
3. Определить юрисдикцию оператора и географию субъектов данных; проверить локализацию по ст. 18(5) 152-ФЗ и трансграничную передачу Telegram по ст. 12; только затем завершить и утвердить уведомление и включать data-legal-notice-ready.
4. После решения по размещению данных и staging настроить TELEGRAM_BOT_TOKEN и OWNER_CHAT_ID как Supabase secrets; INTAKE_ENABLED оставить false до прохождения staging и реальных Telegram тестов.
5. Только после отдельного решения владельца включать API и публиковать ссылки источников.

## История версий

| Версия | Статус | Дата | Изменения |
|---|---|---|---|
| 1.9 | Актуально | 2026-11-10 | Добавлена подготовка расширения условных полей Intake в feature-ветке; Production не менялся. |
| 1.7 | Актуально | 2026-11-10 | Восстановлены и сверены 25 source migration versions; отмечено безопасное исключение Telegram owner seed. |
| 1.6 | Актуально | 2026-11-10 | Уточнена модель startapp direct links: signed start_param при наличии, иначе unsigned attribution hint с source_param_signed. |
| 1.5 | Актуально | 2026-11-10 | Обновлён Git checkpoint после статических проверок; зафиксирован текущий SHA ветки и неизменность main. |
| 1.4 | Актуально | 2026-11-10 | Добавлены риск локализации по 152-ФЗ, трансграничная передача Telegram и точное состояние секретов: не проверялись и не менялись. |
| 1.3 | Актуально | 2026-11-10 | Зафиксирован Telegram Intake, fail-closed/legal gate, 90-дневное хранение и блокеры migration drift/staging. |
| 1.2 | Актуально | 2026-11-10 | Обновлены фактические проверки hash bootstrap, статус утверждения и оставшиеся вопросы; добавлена оценка SDK. |
| 1.1 | Актуально | 2026-11-10 | Зафиксировано утверждение владельца и реализация платформенного слоя Этапа 1. |
| 1.0 | Актуально на момент создания | 2026-11-10 | Первичная передача состояния и открытых вопросов по Этапу 0. |


## 9. Production rollout — Telegram Intake (2026-11-10)

- Владелец разрешил перенос реализации в основной репозиторий и изменения Production.
- Pull Request #19 успешно объединён в `main` методом squash. Merge commit: `2b350d5c6612c3b2be773673a17ddd1e7e513d19`. После merge migration source был исправлен и синхронизирован с фактической production migration history.
- В Production применена миграция `create_intake_applications`; Supabase зарегистрировал версию `20261110143823`. Файл-источник в репозитории: `supabase/migrations/20261110143823_create_intake_applications.sql`.
- Первая попытка миграции была отклонена PostgreSQL: generated column с выражением timestamptz + interval не immutable. Транзакция откатилась без частичных изменений. Миграция исправлена: срок хранения теперь вычисляет trigger при INSERT/изменении статуса/closed_at. После этого миграция применена успешно.
- Проверка после применения: `pg_cron` установлен; `public.intake_applications` создана; RLS и FORCE RLS включены; trigger срока хранения существует; cron job `intake-closed-retention-cleanup` зарегистрирован ровно один раз; записей Intake 0. Отдельный транзакционный тест INSERT → закрытие → проверка 90-дневного retention deadline завершился успешно и был полностью отменён через ROLLBACK.
- В Production развернута Edge Function `intake-submit`, version 1, status ACTIVE, `verify_jwt=false`. Она сама проверяет Telegram initData HMAC; deployment bundle включает `_shared/intake.ts`.
- **Intake остаётся выключенным:** `INTAKE_ENABLED` не устанавливался в `true`; secrets не создавались и не менялись. Реальные `TELEGRAM_BOT_TOKEN` и `OWNER_CHAT_ID` не проверены. Публичная форма остаётся закрыта legal-readiness gate (`data-legal-notice-ready=false`).
- Deno unit tests, browser/iPhone/Telegram runtime tests и реальная отправка заявки не выполнялись. Успешный deploy подтверждает сборку Edge Function, но не end-to-end работу Telegram.
- Security advisor показал INFO по приватной таблице без RLS policy (ожидаемо: schema закрыта, доступ только service_role) и WARN по отключённой защите от скомпрометированных паролей в Auth. Также есть ранее существовавшие findings по Telegram таблицам и performance. Новых критических health findings не выявлено.
- Перед публичным включением необходимо: проверить/установить приватные secrets, владелец должен начать чат с ботом командой `/start`, завершить юридическую проверку локализации/трансграничной передачи и privacy notice, затем выполнить end-to-end QA. До этого `INTAKE_ENABLED` оставить выключенным.



## 10. Conditional Intake fields — implementation branch (2026-11-10)

- Владелец согласовал расширение серверной части и условных полей формы.
- Рабочая ветка: feature/intake-conditional-fields-2026-11-10, создана от main на момент SHA 578ea37fcbeca69a025f28f97f8dd0b53d203e12.
- Обновлены source/presentation/public/pages/apply.html, source/presentation/public/scripts/intake.js и source/design-system/patterns/public-intake.css.
- Общие поля: редактируемое имя, интерес, короткое сообщение до 1000 символов, consent checkbox.
- Partner: required role enum, required weekly availability enum, optional HTTPS portfolio/GitHub URL.
- Own product: optional product name and HTTPS URL, required product stage enum.
- Question: только общие поля.
- Неактивные conditional controls скрываются и disabled; в FormData не попадают.
- Edge Function supabase/functions/intake-submit/index.ts проверяет conditional requirements, enum values, optional text length и HTTPS URLs; Telegram notification включает соответствующие поля. Для безопасного rolling deployment Edge Function также распознаёт старый payload без conditional keys и использует прежний RPC overload.
- Добавлена миграция supabase/migrations/20261110183000_add_intake_conditional_fields.sql: шесть типизированных колонок, CHECK constraints и обновлённая RPC сигнатура. Совместимость старых заявок обеспечивается conditional_fields_version=0 и пустыми дополнительными полями; новые RPC-вставки записываются с версией 1 и проходят проверку выбранного interest. Реальный migration dry-run ещё не выполнен.
- Обновлена спецификация docs/product/intake-module-specification.md до версии 1.3 и changelog за 2026-11-10.
- Production migration не применялась. Edge Function не развёртывалась. Secrets не менялись. INTAKE_ENABLED не менялся. Main не менялся.
- Проверено чтением содержимого файлов в feature branch. Deno runtime недоступен; SQL migration не исполнялась; нет browser/iPhone Safari/Telegram E2E тестов.
- Rollout без простоя: (1) применить миграцию, сохранив старый 12-параметрический RPC overload; (2) deploy новой Edge Function, которая принимает старый payload и маршрутизирует его в legacy RPC, а новый payload — в расширенный RPC; (3) опубликовать новый frontend. После проверки старый RPC overload можно удалить отдельной cleanup migration. Если Edge Function развернуть до миграции, новые заявки не сохранятся. До согласованного rollout Production остаётся на прежней версии.


## 9. Intake — Production conditional-fields rollout (2026-11-10)

- По отдельному подтверждению владельца в Production Supabase project `yajybgdorhxebbigwjgi` применена миграция `add_intake_conditional_fields`; фактическая версия в `supabase_migrations.schema_migrations` — `20261110152808`.
- Файл миграции в feature branch переименован в `20261110152808_add_intake_conditional_fields.sql`, чтобы имя файла совпадало с Production migration history и будущий `db push` не пытался повторно применить DDL.
- Добавлены typed columns и CHECK constraints для conditional fields; старые заявки совместимы через `conditional_fields_version=0`.
- Создан новый 18-argument `public.intake_submit` overload; старый 12-argument overload сохранён для rolling compatibility. Оба overload имеют `SECURITY INVOKER`, пустой `search_path`, EXECUTE только у `service_role`; у `anon` и `authenticated` EXECUTE отсутствует.
- Проверено, что `intake_applications` сохраняет RLS и FORCE RLS. До и после транзакционных smoke tests в таблице 0 строк.
- В Production Edge Function `intake-submit` развёрнута version 2 (ACTIVE, `verify_jwt=false`, как у предыдущей версии). Загружены entrypoint и общий модуль `_shared/intake.ts`.
- Выполнены rollback-only RPC smoke tests: legacy 12-argument contract, новый partner payload, own-product payload, question payload и idempotency duplicate response. Все тестовые транзакции откатились; постоянных тестовых заявок не осталось.
- Не запускались Deno unit tests, реальный HTTP/Telegram Mini App E2E и browser/iPhone Safari QA.
- `INTAKE_ENABLED` не включался; Production secrets не читались и не менялись; публичный приём заявок остаётся закрытым. Frontend не выкладывался: условная форма остаётся в Draft PR #20 до отдельной проверки и интеграции.
- Production Supabase migration и Edge Function deploy выполнены по прямому подтверждению владельца от 2026-11-10. GitHub `main` не изменялся.

## 11. Website-first Intake — owner-approved next implementation slice (2026-11-10)

- Владелец одобрил вариант А: обычная веб-форма на raymondovich.ru без обязательного Telegram для посетителя.
- Канонический поток: visitor → website form → Intake Edge Function → database → owner Telegram notification.
- Telegram — только канал уведомления владельца; Mini App может остаться необязательной точкой входа, но не обязательным шагом.
- База данных — единый источник истины для Telegram и будущего блока «Заявки» в Raymondovich Control Center. UI блока не входит в текущий срез.
- Разделить application lifecycle status (new, in_review, approved, rejected, closed) и notification delivery status (pending, sent, failed). Нужен durable outbox/retry; запись заявки сохраняется до отправки Telegram.
- Атрибуция: first-touch + last-touch отдельно; UTM source/medium/campaign/content/term, landing page, referrer, timestamps; отсутствие меток не блокирует заявку; источники расширяемые и недоверенные.
- Публичный endpoint остаётся anonymous (verify_jwt=false) с обязательными серверными валидацией, idempotency, rate/abuse controls, consent timestamp + notice version; Telegram ID не используется как обязательная идентичность или rate-limit key.
- Документы Intake Specification и ADR-0004 дополнены owner-approved amendment.
- Следующий шаг: реализовать совместимую DB migration, backend persistence/outbox/retry, web form submit и тесты. Сначала проверить миграционную историю/контракты; не выполнять Production DDL или deploy без отдельного разрешения.
- INTAKE_ENABLED остаётся выключенным; legal gate остаётся закрытым. Никакие production secrets, Edge Functions, DB schema или frontend deployment в рамках документационного amendment не менялись.

## 12. Website-first Intake — Production DB foundation applied (2026-11-10)

- Owner explicitly authorized changes directly in Production Supabase and GitHub `main`.
- Production project `yajybgdorhxebbigwjgi` received migrations:
  - `20261110161352_website_first_intake_foundation`
  - `20261110161410_fix_intake_lifecycle_trigger_order`
  - `20261110161441_secure_intake_private_tables`
- Database now supports nullable Telegram identity, request channel, separate application and notification statuses, consent notice version, first/last attribution JSONB, private durable notification outbox, status history and service-role-only website RPC `intake_submit_website`.
- Legacy Telegram RPC overloads and legacy status fields remain for compatibility. Existing application count was 0 before the migration.
- A rollback-only SQL smoke test verified website RPC persistence, atomic outbox creation, status history, close/retention behavior and notification delivery status remaining `sent` after application closure. Test transaction rolled back; Production application count remains 0.
- Migration SQL source files were copied from remote migration history into `supabase/migrations/` on `main`.
- No Edge Function deployment, frontend deployment, secrets change, `INTAKE_ENABLED` change or legal gate change was performed.
- Next implementation slice: update Intake Edge Function for anonymous website submission and durable outbox delivery/retry; then update website form. Public Intake remains closed until legal readiness and end-to-end verification.


## 13. Website-first Intake — code implementation status (2026-11-10)

- Added source-only Edge Function `supabase/functions/intake-website-submit/index.ts`. It does not replace the existing Telegram `intake-submit` function.
- Endpoint design: anonymous browser requests, allowlisted Origin, POST/OPTIONS, JSON content type and 16 KiB body limit, form schema validation, honeypot/minimum-duration filter, consent with exact server-configured notice version, idempotent website RPC, persistence before Telegram notification.
- Added and applied Production migration `20261110161956_add_intake_notification_delivery_rpc`; `public.intake_set_notification_delivery` is service_role-only and updates outbox + notification status with attempt/backoff metadata.
- Updated `source/presentation/public/scripts/intake.js`, `source/application/intake/intake-submit.js`, `source/presentation/public/pages/apply.html`, and `supabase/config.toml` for the website-first browser flow. Legacy Telegram Mini App backend is left untouched.
- New function is not deployed. Frontend is not deployed. `INTAKE_ENABLED` remains false. Legal readiness remains false. No new secrets were set.
- Important gaps: no robust rate-limit/challenge yet (honeypot and form-duration check are not sufficient as sole abuse protection); no scheduled outbox worker yet, so failed deliveries are persisted with retry metadata but are not automatically retried on a timer; approved notice version not configured; no Deno compile/HTTP/Telegram/browser/iPhone tests executed.
- Public activation is blocked until abuse protection, scheduled retry worker, legal notice/version, and E2E verification are complete.


## 14. Website Intake — Turnstile challenge integration (2026-11-10)

- Created Cloudflare Turnstile widget `Raymondovich Website Intake` in managed mode. Allowed hosts: `raymondovich.ru`, `www.raymondovich.ru`, `raymondovich.online`, `www.raymondovich.online`, `localhost`, `127.0.0.1`. Public sitekey: `0x4AAAAAAF7mQ44haZR2d1K4`.
- Updated the website form to load Turnstile explicitly, render action `intake_submit`, require a valid widget token before enabling submit, and reset the widget after each request attempt.
- Updated `intake-website-submit` source to verify every token server-side using Cloudflare Siteverify and check success, action and hostname. The endpoint fails closed if `TURNSTILE_SECRET` is absent and returns a service-unavailable response if Siteverify cannot be reached.
- Changes committed directly to `main`: `3913dc0`, `37e137f`, `111843f`, `ea4e95d`.
- The Turnstile secret is not stored in Git and has not been added to Supabase. The current connector exposes no Supabase secret-write action; owner must add `TURNSTILE_SECRET` through Supabase Dashboard using the secret from the Cloudflare widget settings.
- The new Edge Function is still not deployed; frontend is not published. No database changes, secrets, `INTAKE_ENABLED`, legal gate or public activation were changed.
- Turnstile is a challenge layer, not a hard request quota. It does not replace application-level rate limiting if abuse patterns later require it.
- No Deno compile, HTTP verification, live Siteverify test, browser or iPhone Safari QA was run. Public Intake remains blocked pending secret provisioning, outbox retry worker, legal approval and end-to-end QA.


## Website-first Intake — retry worker source checkpoint (2026-11-10)

- Последний известный Git commit для worker source/config: `b538d1dc3863e652a6cf5de4eccbabbec736cb01`.
- Добавлен `supabase/functions/intake-notification-worker/index.ts`: server-to-server worker, авторизация через `x-intake-worker-secret` / `INTAKE_WORKER_SECRET`, batch size 5, claim lock 180 seconds, отправка Telegram и обновление через существующий `intake_set_notification_delivery`.
- `supabase/config.toml` содержит `verify_jwt = false` для worker. Это безопасно только при обязательной проверке выделенного worker secret; secret пока не создан/не подтверждён.
- Production DB read-only inspection: pg_cron установлен, Vault установлен, pg_net доступен, но не установлен. Outbox не содержит payload; worker должен читать application отдельно через service-role REST.
- Блокер: не создан `intake_claim_notification_batch` и не настроен cron. Supabase CLI отсутствует; согласно Supabase workflow миграцию нужно создавать через `supabase migration new`. Не обходить это ручным созданием миграции или прямым DDL.
- Не деплоить worker и не создавать cron до claim RPC, pg_net migration, настройки одинакового worker secret в Edge Functions и Vault, и проверки worker. `INTAKE_ENABLED=false`, legal gate закрыт; website function и frontend не развернуты/не опубликованы.
- Текущий статус тестирования: source review выполнен; Deno compile, SQL concurrency tests, Telegram HTTP integration и iPhone Safari QA не выполнялись.


### Retry worker — database claim primitive applied (2026-11-10)

- Production migration `20261110164405_add_intake_notification_claim_and_pg_net` применена; remote migration history подтверждает версию `20261110164405`. SQL source находится в `supabase/migrations/20261110164405_add_intake_notification_claim_and_pg_net.sql`.
- Установлен pg_net 0.20.4. HTTP functions доступны в schema `net`.
- Создан service_role-only RPC `public.intake_claim_notification_batch(integer, integer)`: `FOR UPDATE SKIP LOCKED`, lock expiry, batch bounds, return application_id only.
- Rollback-only SQL smoke test: first claim PASS; active lock prevents second claim PASS; expired lock can be reclaimed PASS. Transaction rolled back; live application/outbox counts remain 0/0.
- Security Advisor теперь дополнительно показывает `extension_in_public` WARN для pg_net (extension metadata schema public; extension non-relocatable; HTTP functions schema net). Не пытаться перемещать extension без отдельного обоснования. Другие advisor findings не менялись.
- Migration fallback: Supabase CLI отсутствовал в runtime, поэтому migration была применена через MCP `apply_migration`, remote version проверена и source восстановлен в GitHub. Не выдавать это за CLI workflow.
- Остаётся: настроить `INTAKE_WORKER_SECRET` одновременно в Edge Function Secrets и Vault; развернуть worker после проверки; создать pg_cron schedule с pg_net; выполнить реальный HTTP/Telegram integration test. Не создавать cron до deploy и secret provisioning. Публичный Intake всё ещё закрыт.

 
### Intake worker deployment checkpoint — 2026-11-10

- `intake-notification-worker` deployed to Production project `yajybgdorhxebbigwjgi`, ACTIVE version 2, `verify_jwt=false`; worker performs custom constant-time secret header check.
- Vault secret `intake_worker_secret` exists. A one-off pg_net invocation using that Vault secret reached the worker and passed its worker-secret check.
- Diagnostic response from deployed worker: HTTP 503 `worker_configuration_error`, missing only `OWNER_CHAT_ID`. `SUPABASE_URL`, service-role key, `TELEGRAM_BOT_TOKEN`, and `INTAKE_WORKER_SECRET` passed presence/format checks. No secret values were exposed.
- Add Supabase Edge Function Secret `OWNER_CHAT_ID` with the numeric owner Telegram chat ID. Then repeat empty-batch invocation; expected 200 JSON `{ok:true, claimed:0, sent:0, failed:0}`.
- No Telegram message sent; 0 applications / 0 outbox. Cron not scheduled. Public Intake remains disabled and legal gate closed.
- Current worker source is on main; diagnostic missing-config names are returned only after worker-secret authentication. Latest relevant commit: `6ebdb87e505e5f39ec4f42b63b04c65bf39a7138`.


### Restricted Telegram Intake test — deployed 2026-11-10

- Test route is live at Telegram deep link: `https://t.me/raymondovich_bot/raymondovich?startapp=apply-test`.
- Frontend: `#apply-test` mapped by Telegram start parameter; form only renders in Telegram Mini App with non-empty initData and exact startParam `apply-test`.
- Backend: Production Edge Function `intake-test-submit`, ACTIVE v1, `verify_jwt=false`; validates Telegram initData HMAC, auth_date, signed start_param, and allowlist secret `INTAKE_TEST_ALLOWED_USER_IDS`. Fail-closed if configuration is absent.
- Owner reported adding `INTAKE_TEST_ALLOWED_USER_IDS=1969734974`; value cannot be read through current tools. A probe with invalid initData returned 400 `invalid_init_data`, not 503, proving required config presence but not verifying the exact allowlist value.
- Test submissions use the existing `intake_submit` RPC and are stored in `public.intake_applications` with fixed `source=other`, `campaign=test`; Telegram group notification is direct and carries a prominent test label. Filter `campaign=test` from real applicant reporting.
- Test endpoint uses the legacy intake RPC rate limits: one submission per 10 minutes and five per 24 hours per Telegram ID. Idempotent duplicate does not send a second Telegram notification.
- Frontend live HTTP GET checks: apply-test page, test client, bootstrap, router and index returned 200; live bootstrap/router/index contain the new route/client module. Supabase deploy returned ACTIVE v1. No actual Telegram signed initData, DB insert, group message, or iPhone UI interaction has yet been tested.
- This test path does not use the notification outbox worker. It tests direct Telegram delivery from the isolated test submit function.
- Public website Intake remains disabled. No change to `INTAKE_ENABLED`, legal readiness gate, public submit handler, or cron.
- Next: owner opens the Telegram link, submits only dummy test data, then confirm the Telegram group notification and DB row with `campaign=test`. Do not mark end-to-end as passed until both are observed.
