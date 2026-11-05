# Подготовка переноса архитектурной ветки в main

**Дата актуализации:** 05.11.2026  
**Репозиторий:** `raymondovich-cloud/raymondovich.ru`  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**Целевая ветка:** `main`  
**Базовый commit main:** `89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4`

## 1. Границы и запреты

Работа выполняется только в рабочей ветке. Не изменяются `main`, backup branch, `raymondovich.online`, production Supabase/Auth/data/RLS/grants/Edge Functions, DNS, Cloudflare, hosting и production deployment. Слияние возможно только после отдельного явного одобрения владельца.

## 2. Реализованная основа

На рабочей ветке уже присутствует прикладная SPA-реализация, поэтому прежние формулировки «SPA implementation not started» и «ADR-002 proposed» более неактуальны.

- Корневой `index.html` является точкой входа Vue SPA.
- Используются Vue 3, Vue Router 5 и Vite 8; TypeScript не внедрён.
- Используется Hash Router; GitHub Pages рассматривается только как временная тестовая среда. Production hosting остаётся отдельным решением.
- Созданы route registry и представления Public Space, Owner Control Center, Partner Workspace и External Project Workspace.
- Созданы Public views для главной, продуктов, сотрудничества, подхода, профиля, настроек и legal pages.
- Основные старые публичные HTML URL перенаправляются в SPA через compatibility entry modules.
- Legacy auth callback и password recovery entry points сохранены как отдельные compatibility bridges, чтобы не терять текущие URL-контракты.
- Supabase client изолирован в Infrastructure gateways/repositories; Application использует внедряемые gateways/repositories.
- Domain содержит правила нормализации и проверки Idea/Project данных.
- Созданы unit tests для Application и Domain, архитектурные dependency-boundary tests и build-output smoke checks.
- CI генерирует lockfile, устанавливает зафиксированные зависимости, запускает тесты, production build и smoke checks.

## 3. Git и CI — динамические сведения

Состояние ветки меняется последовательными коммитами, поэтому значения ahead/behind и HEAD нельзя считать постоянными. Перед финальным PR необходимо заново получить актуальные SHA `main` и рабочей ветки, выполнить GitHub Compare и проверить, что рабочая ветка не отстаёт от `main`.

Последние подтверждённые успешные workflow runs на промежуточных SHA:
- `42101259216` — unit tests, build и build-output smoke checks: SUCCESS.
- `42101544263` — CI: SUCCESS.
- `42101553806` — CI: SUCCESS.

После этих успешных запусков в ветку продолжали поступать изменения. Следовательно, эти результаты не подтверждают автоматически зелёный CI на текущем HEAD. Последний workflow на точном HEAD должен завершиться успешно после прекращения изменений.

## 4. Текущие функциональные ограничения

### Public Space
- Содержимое основных публичных страниц перенесено в Vue views.
- Три направления на странице сотрудничества должны сохранять утверждённые формулировки:
  - OWN PROJECTS — «Собственные проекты — создаём и развиваем свои продукты».
  - PARTNER PROJECTS — «Партнёрские проекты — объединяем усилия для совместного развития».
  - EXTERNAL PROJECTS — «Сторонние проекты — отбираем перспективные разработки для сотрудничества».
- Privacy, Terms и Cookies в исходном `main` уже отображали «В разработке»; SPA сохраняет этот фактический статус, а не подменяет его вымышленным юридическим текстом.
- SEO для отдельных SPA-маршрутов (canonical, description, индексируемый контент и prerender/SSR) требует отдельного решения до production cutover.

### Owner Control Center
- Перенесены Overview, Ideas и Projects, включая создание/редактирование идей, статусы, приоритеты, архив, запуск идеи в проект, pin, pause/resume, complete, delete, dialogs и контекстные действия.
- Доменная валидация и unit tests добавлены.
- Операции launch idea → project и delete project → restore idea по-прежнему состоят из нескольких запросов с компенсационным поведением, а не из одной серверной транзакции. Конкурентность и частичные сбои требуют отдельного integration-level подтверждения.
- Нельзя считать parity полностью доказанным только по сборке и unit tests: требуется browser-level проверка всех сценариев, в том числе на мобильном Safari.

### Partner Workspace и External Project Workspace
- Маршруты и базовые placeholder views существуют.
- Это **не готовые рабочие кабинеты**: реальные partner membership, external project membership, роли, data model и серверные политики доступа в репозитории не подтверждены.
- Нельзя выдавать эти пространства за реализованные. До появления проверяемой модели и backend enforcement они должны оставаться явно ограниченными placeholders либо быть вынесены за рамки данного merge отдельным решением владельца.
- UI route guards не являются security boundary.

### Authentication и Account
- Перенесены Application services и runtime composition; сохранены legacy URL entry points для callback и password recovery.
- Unit tests проверяют вызовы use cases, но не доказывают полный реальный Supabase email confirmation, OAuth/PKCE callback, password recovery, session restoration, logout и redirect allow-list.
- Production Supabase Auth settings, email templates и Redirect URL allow-list не проверялись и не менялись. Перед production cutover нужна проверка конфигурации в согласованном безопасном порядке.
- В callback и recovery нельзя считать успешный unit test заменой end-to-end проверки с тестовым пользователем и изолированной средой.

## 5. Архитектурные и инфраструктурные ограничения

- Domain/Application dependency boundary автоматизированно проверяется; Domain/Application не должны импортировать Supabase SDK, Vue, DOM или Presentation.
- Infrastructure содержит Supabase adapters. Publishable key в клиентском приложении не является service-role secret; service-role/private credentials не должны попадать в bundle.
- В репозитории отсутствует подтверждённый полный актуальный снимок live schema, RLS и grants для всех задействованных таблиц, в частности pre-existing `projects` и `user_profiles`. Статические миграции не доказывают состояние удалённой БД.
- Production database/RLS/grants не менялись и не должны изменяться в рамках этой подготовки.
- Реальный iOS Safari на устройстве владельца не проверен.
- Автоматизированный browser E2E suite (например, Playwright) пока не подтверждён как обязательный и проходящий gate.
- GitHub Pages/Hash Router не утверждает production hosting. ADR-001 остаётся частично решённым.
- ADR-003 (state management) и ADR-004 (testing strategy) нужно сверить с текущим кодом и фактическим тестовым контуром; статус документа не должен представлять предложенные технологии как внедрённые без проверки.

## 6. Условия допуска к финальному merge review

1. Завершить audit всех файлов и сравнить текущую реализацию с исходным поведением `main`.
2. Подтвердить все legacy URL, прямые переходы, reload, back/forward, anchor links и auth redirects.
3. Добавить/запустить browser-level tests для критических public, owner, auth и account flows.
4. Провести изолированные Supabase integration/RLS tests; если live schema нельзя безопасно подтвердить, явно зафиксировать это как merge blocker или отдельное решение о допустимом scope.
5. Разрешить неоднозначность по Partner/External workspaces: рабочая реализация с серверной авторизацией либо явно согласованный ограниченный scope.
6. Проверить SEO/public metadata и production hosting decision; не менять production инфраструктуру.
7. Провести security scan на случайные секреты и убедиться, что build/deploy workflows не запускают production deployment.
8. Обновить migration matrix, ADRs, changelog, rollback notes и этот статусный документ.
9. Получить успешный CI на точном финальном HEAD после прекращения изменений.
10. Проверить актуальный diff с `main`, отсутствие конфликтов/неучтённых коммитов и подготовить PR.
11. Не выполнять merge до отдельного одобрения владельца.

## 7. Текущий статус

**SPA foundation:** IMPLEMENTED IN WORKING BRANCH.  
**Public routes:** IMPLEMENTED; content/SEO parity audit remains.  
**Owner Control Center:** IMPLEMENTED; browser parity and failure/concurrency verification remain.  
**Authentication/account:** MIGRATED WITH LEGACY BRIDGES; real Supabase E2E verification remains.  
**Partner Workspace:** PLACEHOLDER — NOT OPERATIONAL.  
**External Project Workspace:** PLACEHOLDER — NOT OPERATIONAL.  
**Live Supabase schema/RLS/grants certification:** NOT VERIFIED.  
**iOS Safari verification:** NOT PERFORMED.  
**CI on latest HEAD:** MUST BE RECONFIRMED.  
**Merge readiness:** NOT READY.  
**Merge to main:** NOT PERFORMED; explicit owner approval required.
