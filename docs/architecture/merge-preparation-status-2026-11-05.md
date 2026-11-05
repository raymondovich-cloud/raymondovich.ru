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

Последний подтверждённый успешный полный pipeline: workflow run `42104225677`, build job checkout SHA `6148c7f5ccf044b0911e44787f002bf62098ed47`:
- `npm ci` — SUCCESS.
- `npm test` — **50 tests passed, 0 failed**.
- `npm run build` — SUCCESS.
- `npm run test:build` — SUCCESS; проверены SPA entry, legacy URL handoffs, Auth bridges, hash compatibility, route registry и dependency boundaries.

После этого commit в ветку добавлялись дальнейшие изменения и документация. Поэтому этот успешный запуск не заменяет обязательный успешный CI на точном финальном HEAD. Последний workflow на актуальном HEAD должен завершиться успешно после прекращения изменений.

CI запускается push-событиями рабочей ветки и вручную; единственный build job имеет точный guard на `refs/heads/architecture/spa-rewrite-2026-11-05`, поэтому ручной запуск на `main` не выполняет сборку. Workflow не содержит production deploy step. Lockfile generation/self-commit job удалён: workflow имеет только `contents:read`, использует проверенный `package-lock.json` через `npm ci` и не изменяет ветку из CI.

## 4. Public Space и утверждённый текст

- Основные публичные страницы перенесены в Vue views.
- В `Cooperation.vue` сохранён утверждённый блок «01 / НАПРАВЛЕНИЯ», заголовок «Три формата развития проектов» и три точные формулировки:
  - OWN PROJECTS / «Собственные проекты» — «Продукты и цифровые решения, которые мы самостоятельно разрабатываем и развиваем.»
  - PARTNER PROJECTS / «Партнёрские проекты» — «Направления, к которым можно присоединиться, чтобы совместно создавать, развивать и продвигать продукты.»
  - EXTERNAL PROJECTS / «Сторонние проекты» — «Разработки независимых авторов, которые могут стать частью экосистемы после рассмотрения и согласования условий сотрудничества.»
- Privacy, Terms и Cookies в исходном `main` уже отображали «В разработке»; SPA не подменяет этот статус вымышленным юридическим текстом.
- Для корневой публичной страницы добавлена техническая SEO-основа: title/description, robots directives, Open Graph и X/Twitter metadata, JSON-LD `Organization`/`WebSite`, `robots.txt` и консервативный `sitemap.xml` только с canonical homepage. Это не означает, что все SPA-маршруты независимо индексируются.
- Route-specific SEO (canonical, уникальные descriptions, prerender/SSR) остаётся заблокированным до решения по production hosting/routing. Hash fragments не публикуются как отдельные sitemap URLs; подробности — `docs/architecture/seo-strategy.md`.

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
- Migration history восстановлена в рабочей ветке: четыре отсутствовавших файла (`20261008184130_create_user_profiles_rls`, `20261008184746_temporary_promote_admin`, `20261008185014_lock_temporary_admin_function`, `20261008195529_create_project_management`) восстановлены из read-only `supabase_migrations.schema_migrations.statements`.
- Project extension migration приведена к live version `20261104131912_extend_projects_for_idea_inbox.sql`; прежний неприкреплённый version `20261104120000` удалён.
- Сверка всех **14** файлов `supabase/migrations/*.sql` с live migration ledger завершилась: filenames/versions/names совпадают полностью, SQL statement content differences — **0**.
- Policies `admin manages projects` и user profile policies теперь присутствуют в восстановленных checked-in migrations. Это восстанавливает migration-source parity с live ledger; clean local Supabase replay ещё не выполнен. Data seed migrations имеют prerequisites по owner/admin и проекту LifeGame, которые нужно подготовить в изолированной среде.
- Все изменения касались только файлов в рабочей ветке; production Supabase не менялся.

### Grants и security findings

- У роли `anon` обнаружены table privileges на `ideas`, включая SELECT/INSERT/UPDATE/DELETE и TRUNCATE/TRIGGER/REFERENCES. Row access закрыт отсутствием anon RLS policy, но RLS не защищает от TRUNCATE; избыточные anon grants требуют отдельного security remediation и явного разрешения владельца.
- Для `projects` обнаружены CRUD grants у `authenticated`, anon grants не обнаружены.
- Security Advisor сообщил: **Leaked Password Protection Disabled**. Настройка Supabase Auth не менялась.
- В `public` найден `SECURITY DEFINER` function `promote_raymondovich_admin(text)`, но `anon` и `authenticated` не имеют права `EXECUTE`; других public functions, доступных anon для `EXECUTE`, запрос не обнаружил.
- Production Auth Redirect URL allowlist и email templates не проверялись через Dashboard/API и не менялись.
- Изолированного Supabase test project для integration/RLS tests в рамках этой работы не использовали; реальные RLS tests с несколькими test identities остаются невыполненными.

### Migration history и privileged functions

- Live `supabase_migrations` содержит 14 записей; в рабочей ветке теперь присутствуют 14 migration files с теми же версиями/именами. Четыре ранее отсутствовавших файла восстановлены в migration branch:
  - `20261008184130_create_user_profiles_rls.sql`;
  - `20261008184746_temporary_promote_admin.sql`;
  - `20261008185014_lock_temporary_admin_function.sql`;
  - `20261008195529_create_project_management.sql`.
- Восстановленные SQL-файлы сверены с массивами `statements` из read-only `supabase_migrations.schema_migrations`: для всех 14 migration versions различий в SQL statements не обнаружено. Это подтверждает соответствие сохранённого SQL доступным записям live ledger; clean isolated staging replay всё равно необходим для проверки применимости полного набора, prerequisites и итоговой schema/policies/grants.
- Для расширения projects checked-in файл `20261104131912_extend_projects_for_idea_inbox.sql` совпадает с live migration version; SQL statements также входят в сверку с нулём различий. Clean staging replay остаётся обязательным для проверки порядка и результата применения.
- Policy `admin manages projects`, обнаруженная в live schema, присутствует в восстановленном `20261008195529_create_project_management.sql`; её SQL входит в сверку migration statements. Реальные positive/negative RLS integration tests с несколькими identities ещё не выполнены.
- Live function `public.promote_raymondovich_admin(target_email text)` имеет `SECURITY DEFINER`; отдельная следующая migration отзывает EXECUTE у `PUBLIC`, `anon` и `authenticated`. Live ACL показывает EXECUTE только у `postgres` и `service_role`; production function не изменялась.
- Migration files восстановлены только в рабочей ветке; production migration history/schema не менялись и migrations не применялись. Нельзя запускать эти миграции поверх live database вслепую.

## 8. Остальные ограничения

- Реальный iOS Safari на устройстве владельца не проверен.
- Browser E2E suite (например, Playwright) не внедрён; текущие проверки — Node unit/architecture tests и build-output smoke checks.
- Production routing/hosting не утверждены. Hash Router — только временное решение. Репозиторий сообщает `has_pages=true`, default branch — `main`; в `main` нет deployment workflow. Точный GitHub Pages publishing source не удалось прочитать через доступный API. Корневой `index.html` migration branch загружает исходный `main.js` с bare imports `vue`/`vue-router`, то есть для работы необходим Vite build artifact. CI собирает `dist/`, но не публикует его. Если GitHub Pages настроен на публикацию корня `main`, прямое слияние приведёт к выдаче несобранного SPA и поломке сайта. **До merge необходимо подтвердить Pages source и подготовить/утвердить способ публикации Vite build; production deploy не разрешён.**
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
**Public routes:** IMPLEMENTED; homepage technical SEO foundation added; route-level SEO and browser parity remain.  
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


## SEO foundation — 2026-11-05

- Root homepage metadata extended with Open Graph locale/site name, X/Twitter summary metadata, Googlebot directives and JSON-LD graph.
- Added `public/robots.txt` and `public/sitemap.xml`; Vite copies them to the build output root, and `scripts/verify-build.mjs` checks the copied output. Sitemap intentionally contains only `https://raymondovich.ru/`.
- Added `docs/architecture/seo-strategy.md` documenting the Hash Router indexing limitation and production decision gates.
- No approved social preview image or favicon asset exists in the branch; neither was invented.
- Route-level SEO, prerender/SSR, canonical host and Search Console verification remain open until production routing/hosting is decided.
- No production infrastructure was changed.


## Latest CI after SEO and workflow hardening

- Run: `42104763907`
- Exact tested HEAD: `c9c4502dea4b211ce2a07193ad1fc3a78a3ac53c`
- Result: SUCCESS.
- `npm ci --ignore-scripts --no-audit --no-fund`: SUCCESS.
- `npm test`: **50 passed, 0 failed**.
- `npm run build`: SUCCESS.
- `npm run test:build`: SUCCESS (`SPA build smoke checks passed`).
- The workflow now has a single read-only build job; no CI-side lockfile generation or branch write permission.
- This CI run verifies the homepage metadata, sitemap and crawler files are present in the branch checkout only insofar as the build includes the root output; the JSON-LD and sitemap were separately syntax-checked in the repository content. It does not validate live production crawl/indexing or route-specific SEO.


## SEO asset build-path correction — 2026-11-05

- Crawler source files are stored under Vite's `public/` directory, not at repository root.
- Duplicate root-level copies were removed to prevent source/output ambiguity.
- Build smoke checks now compare `dist/robots.txt` and `dist/sitemap.xml` with `public/robots.txt` and `public/sitemap.xml`.
- This verifies build artifact presence, not live HTTP availability; production deployment and crawler access remain unverified.
