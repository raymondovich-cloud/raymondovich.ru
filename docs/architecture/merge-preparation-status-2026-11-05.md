# Подготовка переноса архитектурной ветки в main

**Дата актуализации:** 05.11.2026  
**Репозиторий:** `raymondovich-cloud/raymondovich.ru`  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**Целевая ветка:** `main`  
**Базовый commit main:** `89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4`

## 1. Границы и запреты

Работа выполняется только в рабочей ветке. `main`, backup branch, `raymondovich.online`, production Supabase/Auth/data/RLS/grants/Edge Functions, DNS, Cloudflare, hosting и production deployment не изменялись. Слияние возможно только после отдельного явного одобрения владельца.

## 2. Реализованная основа

- Корневой `index.html` — единственная точка входа Vue SPA.
- Стек зафиксирован: Vue 3.5.45, Vue Router 5.4.0, Vite 8.3.6, JavaScript ES modules; TypeScript не внедрён.
- Используется Hash Router только в пределах временной GitHub Pages/test модели согласно ADR-001. Production hosting/routing не утверждены.
- `spa.html` — noindex compatibility handoff, а не вторая SPA.
- Старые публичные HTML URL перенаправляются в SPA через общий redirect module и route aliases.
- Старые Supabase Auth callback и password recovery страницы сохранены как отдельные compatibility bridges: текущие ссылки могут содержать implicit-flow token fragments, которые нельзя без дополнительной миграции помещать в Hash Router fragment.
- Callback use case поддерживает и PKCE query code, и существующую implicit token-fragment session; после подтверждения email создаётся/проверяется профиль пользователя. Admin направляется в Owner Control Center, обычный пользователь — на публичную главную.
- Реализованы Public views: главная, продукты, сотрудничество, подход, профиль, настройки и legal pages.
- Реализован Owner Control Center: Overview, Ideas, Projects. Разделы доступны по маршрутам `/owner`, `/owner/ideas`, `/owner/projects`; внутреннее переключение синхронизировано с Router и browser history.
- Partner Workspace и External Project Workspace пока являются placeholders; рабочие операции и project-scoped membership не реализованы.
- Supabase client изолирован в Infrastructure gateways/repositories; Application services получают зависимости через composition runtime и не импортируют Supabase SDK.
- Domain содержит правила построения/валидации Idea и Project records.
- Внешние слои не должны импортировать Infrastructure internals; архитектурные проверки закреплены в тестах.
- Зависимости закреплены в `package.json` и `package-lock.json`; CI использует `npm ci`.

## 3. Git и CI

Сравнение GitHub Compare выполняется повторно перед финальным PR; текущие значения HEAD/ahead/behind не следует переносить из этого документа без свежей проверки. Base `main` на последнем подтверждённом чтении: `89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4`.

Последний подтверждённый успешный полный pipeline: workflow run `42103202430`, build job checkout SHA `c0c19c0cf0f4d3ccd63be5543a5eba21179b3543`:
- `npm ci` — SUCCESS.
- `npm test` — **50 tests passed, 0 failed**.
- `npm run build` — SUCCESS.
- `npm run test:build` — SUCCESS; проверены SPA entry, legacy URL handoffs, Auth bridges, hash compatibility, route registry и dependency boundaries.

После этого commit в ветку добавлялись дальнейшие изменения и документация. Поэтому этот успешный запуск не заменяет обязательный успешный CI на точном финальном HEAD. Последний workflow на актуальном HEAD должен завершиться успешно после прекращения изменений.

CI запускается push-событиями рабочей ветки и вручную; оба job имеют точный guard на `refs/heads/architecture/spa-rewrite-2026-11-05`, поэтому ручной запуск на `main` не выполняет jobs. Workflow не содержит production deploy step. Lockfile generation job имеет отдельное `contents:write` разрешение и коммитит lockfile только в рабочую ветку.

## 4. Public Space и утверждённый текст

- Основные публичные страницы перенесены в Vue views.
- В `Cooperation.vue` сохранён утверждённый блок «01 / НАПРАВЛЕНИЯ», заголовок «Три формата развития проектов» и три точные формулировки:
  - OWN PROJECTS / «Собственные проекты» — «Продукты и цифровые решения, которые мы самостоятельно разрабатываем и развиваем.»
  - PARTNER PROJECTS / «Партнёрские проекты» — «Направления, к которым можно присоединиться, чтобы совместно создавать, развивать и продвигать продукты.»
  - EXTERNAL PROJECTS / «Сторонние проекты» — «Разработки независимых авторов, которые могут стать частью экосистемы после рассмотрения и согласования условий сотрудничества.»
- Privacy, Terms и Cookies в исходном `main` уже отображали «В разработке»; SPA не подменяет этот статус вымышленным юридическим текстом.
- SEO отдельных SPA routes (canonical, уникальные description, индексируемый контент, prerender/SSR) остаётся отдельным production decision.

## 5. Owner Control Center

- Перенесены создание/редактирование идей, статусы, приоритеты, архив, восстановление, запуск идеи в проект, pin, pause/resume, complete, delete, dialogs и контекстные действия.
- Доменная валидация и unit tests добавлены.
- Launch idea → project и delete project → restore idea по-прежнему состоят из нескольких запросов с компенсационным поведением, а не из одной серверной транзакции. Конкурентный launch обрабатывает unique violation `23505` повторным чтением существующего проекта и не создаёт дубль. Если проект удалён, но исходную идею не удалось вернуть, ошибка явно сообщает о частичном успехе. Атомарность и partial failures всё ещё требуют отдельного integration-level подтверждения.
- Build и unit tests не доказывают полную UI parity: необходима browser-level проверка всех сценариев, включая мобильный Safari.

## 6. Partner Workspace и External Project Workspace

- Маршруты и базовые placeholder views существуют.
- Это **не готовые рабочие кабинеты**: реальные partner membership, external project membership, проектная модель участников и серверные политики project-scoped доступа не реализованы.
- Read-only проверка live schema не обнаружила таблиц с именами, содержащими `partner`, `external`, `member` или `workspace`.
- Эти пространства нельзя представлять как операционные до реализации и тестирования backend authorization. UI route guards не являются security boundary.

## 7. Supabase: read-only security/schema audit

Проверка выполнена только SELECT-запросами и Security Advisor на проекте `yajybgdorhxebbigwjgi`. Никакие данные, таблицы, RLS, grants, Auth settings или функции не изменялись.

### RLS и policies

- `public.ideas`, `public.projects`, `public.user_profiles`: RLS включён; `FORCE ROW LEVEL SECURITY` выключен.
- `ideas`: policy `admin manages ideas`, роль `authenticated`, условие — JWT `app_metadata.role = 'admin'` и `auth.uid() = owner_id`; тот же предикат в `WITH CHECK`.
- `projects`: live policy `admin manages projects` с аналогичными admin/owner predicates.
- `user_profiles`: отдельные policies ограничивают INSERT/SELECT/UPDATE собственным `user_id = auth.uid()`.
- В live migration history обнаружены четыре версии, отсутствующие в repo: `20261008184130_create_user_profiles_rls`, `20261008184746_temporary_promote_admin`, `20261008185014_lock_temporary_admin_function`, `20261008195529_create_project_management`.
- Filename mismatch устранён в рабочей ветке: checked-in migration переименована с `20261104120000_extend_projects_for_idea_inbox.sql` на live version `20261104131912_extend_projects_for_idea_inbox.sql`; SQL content сохранён без изменений. Оригинальный применённый SQL из Supabase migration history недоступен, поэтому exact content identity не подтверждена; необходим clean staging migration replay.
- Policy `admin manages projects` присутствует в live schema, но не обнаружена в checked-in migrations. Совокупно это означает, что текущая migration history всё ещё не воспроизводит live schema и требует отдельной reconciliation до clean staging deployment; production не менялся.

### Grants и security findings

- У роли `anon` обнаружены table privileges на `ideas`, включая SELECT/INSERT/UPDATE/DELETE и TRUNCATE/TRIGGER/REFERENCES. Row access закрыт отсутствием anon RLS policy, но RLS не защищает от TRUNCATE; избыточные anon grants требуют отдельного security remediation и явного разрешения владельца.
- Для `projects` обнаружены CRUD grants у `authenticated`, anon grants не обнаружены.
- Security Advisor сообщил: **Leaked Password Protection Disabled**. Настройка Supabase Auth не менялась.
- В `public` найден `SECURITY DEFINER` function `promote_raymondovich_admin(text)`, но `anon` и `authenticated` не имеют права `EXECUTE`; других public functions, доступных anon для `EXECUTE`, запрос не обнаружил.
- Production Auth Redirect URL allowlist и email templates не проверялись через Dashboard/API и не менялись.
- Изолированного Supabase test project для integration/RLS tests в рамках этой работы не использовали; реальные RLS tests с несколькими test identities остаются невыполненными.

### Migration history и privileged functions

- Live `supabase_migrations` содержит 14 записей. В checked-in `supabase/migrations/` отсутствуют:
  - `20261008184130_create_user_profiles_rls`;
  - `20261008184746_temporary_promote_admin`;
  - `20261008185014_lock_temporary_admin_function`;
  - `20261008195529_create_project_management`.
- Для расширения projects live history содержит `20261104131912_extend_projects_for_idea_inbox`, тогда как в репозитории лежит файл `20261104120000_extend_projects_for_idea_inbox.sql`. Это timestamp/history mismatch, который нужно reconciliate до утверждения, что чистое staging-развёртывание воспроизводит live schema.
- Live function `public.promote_raymondovich_admin(target_email text)` имеет `SECURITY DEFINER`, но ACL ограничен `postgres` и `service_role`; роли `anon` и `authenticated` не имеют EXECUTE. Функция не изменялась.
- Отсутствующие migration files и privilege mismatch не исправлялись в production. Необходимо отдельно восстановить/согласовать migration history, не перезапуская старые миграции вслепую.

## 8. Остальные ограничения

- Реальный iOS Safari на устройстве владельца не проверен.
- Browser E2E suite (например, Playwright) не внедрён; текущие проверки — Node unit/architecture tests и build-output smoke checks.
- Production routing/hosting не утверждены. Hash Router — только временное решение. Merge в `main` потенциально может изменить публикуемый GitHub Pages сайт; publish source и production cutover должны быть отдельно проверены до слияния.
- ADR-003 (state management) остаётся PROPOSED; Pinia не внедрён.
- ADR-004 (testing strategy) остаётся PROPOSED; текущий тестовый baseline использует встроенный Node.js `node:test`, Vitest/Vue Test Utils/Playwright не внедрены.
- Production Supabase/Auth/data/RLS/grants, DNS, Cloudflare, hosting и deployment не менялись.

## 9. Условия допуска к финальному merge review

1. Завершить audit полного diff и подтвердить соответствие legacy-функций новому UI.
2. Подтвердить direct routes, refresh, Back/Forward, legacy redirects, anchor links и Auth callback/recovery на реальном тестовом пользователе.
3. Провести browser E2E и реальную iOS Safari проверку критических сценариев.
4. Создать/использовать изолированный Supabase test environment и выполнить integration/RLS positive/negative tests.
5. Принять решение по scope Partner/External: реализовать backend membership/authorization либо явно отложить эти пространства отдельным одобренным scope.
6. Согласовать production hosting/routing/SEO и проверить фактический эффект merge на GitHub Pages.
7. Отдельно рассмотреть избыточные `anon` grants на `ideas` и выключенную Leaked Password Protection; никаких изменений без разрешения.
8. Обновить ADR, migration matrix, changelog и rollback notes.
9. Получить зелёный CI на точном финальном HEAD.
10. Повторно сравнить рабочую ветку с актуальным `main`, подготовить PR и проверить отсутствие конфликтов.
11. Не выполнять merge/deployment до отдельного явного одобрения владельца.

## 10. Текущий статус

**SPA foundation:** IMPLEMENTED IN WORKING BRANCH.  
**Public routes:** IMPLEMENTED; SEO and browser parity remain.  
**Owner Control Center:** IMPLEMENTED; browser parity and transaction/concurrency verification remain.  
**Authentication/account:** MIGRATED WITH LEGACY BRIDGES; real Supabase E2E remains.  
**Partner Workspace:** PLACEHOLDER — NOT OPERATIONAL.  
**External Project Workspace:** PLACEHOLDER — NOT OPERATIONAL.  
**Live Supabase RLS:** READ-ONLY SNAPSHOT OBTAINED; integration tests and grant remediation remain.  
**Security Advisor:** password leak protection warning remains unresolved.  
**iOS Safari:** NOT VERIFIED.  
**CI on latest HEAD:** MUST BE RECONFIRMED.  
**Merge readiness:** NOT READY.  
**Merge to main / production deployment:** NOT PERFORMED; explicit owner approval required.


## Latest CI checkpoint — 2026-11-05

- Successful complete CI run: `42103202430`.
- Tested executable code and test commit: `ef0701a9be2ad160037f6b1835a6384685e9318c`.
- 50 tests passed; 0 failed.
- Locked dependency installation, production build and built-output smoke checks passed.
- The current branch head is newer only through documentation commits; source, tests, package manifest and lockfile are unchanged from the tested commit.
- The legacy redirect test now verifies that generic handoff query parameters are moved into router query state. The Supabase PKCE/implicit callback remains a separate HTML bridge.

**Security note:** the live `anon` grants on `public.ideas` include `TRUNCATE`. RLS does not protect TRUNCATE. This is a critical existing least-privilege issue and remains unremediated because no production grants were changed.


## Latest successful CI after concurrency hardening

- Run: `42104225677`
- Tested code commit: `6148c7f5ccf044b0911e44787f002bf62098ed47`
- 50 tests passed; 0 failed.
- `npm ci`, production build and built-output smoke checks passed.
- The run includes the idempotent handling of concurrent project creation using the live unique `source_idea_id` constraint.
- Later branch changes were documentation-only; source, tests, package manifest and lockfile were unchanged from the tested revision.


## Latest verification after project partial-failure handling

- CI run `42104225677` passed on branch HEAD `6148c7f5ccf044b0911e44787f002bf62098ed47`.
- 50 tests passed; 0 failed.
- This run includes idempotent concurrent idea launch and explicit reporting when project deletion succeeds but source-idea restoration fails.
- Dependency lockfile install, production build and build-output smoke checks all passed.
