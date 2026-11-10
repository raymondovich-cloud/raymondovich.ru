# Handoff — текущее состояние

> **Проект:** Raymondovich.ru  
> **Документ:** Передача текущего состояния работы  
> **Версия:** 1.9  
> **Статус:** Актуально с историческими разделами; Telegram Intake реализован в Production и остаётся fail-closed; расширение условных полей подготовлено в feature-ветке  
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
