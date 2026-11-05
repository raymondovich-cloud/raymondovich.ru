# Подготовка переноса архитектурной ветки в main

**Дата проверки:** 05.11.2026  
**Репозиторий:** `raymondovich-cloud/raymondovich.ru`  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**Целевая ветка:** `main`

## 1. Цель и ограничения

Подготовить полноценную миграцию Raymondovich.ru из legacy MPA в согласованную SPA/Modular Monolith архитектуру с сохранением действующих функций. Старые HTML entry points, inline CSS и inline JavaScript — наследие, которое должно быть заменено, а не перенесено как целевая структура.

Работа ведётся только в указанной рабочей ветке. `main`, backup branch, `raymondovich.online`, production Supabase/Auth/data/RLS/grants/Edge Functions, DNS, Cloudflare, hosting и production deployment не затрагиваются. Merge возможен только после отдельного финального разрешения владельца.

## 2. Git состояние

Последнее сравнение `main...architecture/spa-rewrite-2026-11-05`:

- Base `main`: `89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4`.
- Рабочая ветка ahead by **55 commits**, behind by **0**.
- GitHub Compare вернул **26 changed paths**.
- Все 26 путей относятся к `docs/`.
- Изменений application code, HTML, CSS, JavaScript, SQL migrations или app/build configuration относительно main пока нет.

Следствие: SPA rewrite ещё не реализован. Ветка пока содержит архитектурные документы и результаты аудита; её нельзя считать merge candidate с новой работающей архитектурой.

## 3. Подтверждённая исходная структура

Ветка содержит:
- 16 HTML entry points;
- 15 JavaScript modules;
- 2 CSS files;
- 10 SQL migration files;
- нет обнаруженных `package.json`, lockfile, Vite config, tsconfig и GitHub Actions workflow YAML.

В legacy HTML присутствуют inline style blocks и inline scripts. Они не являются частью целевой архитектуры. Целевое приложение — один SPA entry point, единый route registry/router, разделённые Presentation/Application/Domain/Infrastructure и самостоятельный design layer.

## 4. Выполненная работа

- Подготовлена целевая архитектурная спецификация SPA/Modular Monolith.
- Подготовлены ADR-001...ADR-004 и карта целевой структуры репозитория.
- Выполнен статический аудит исходного состояния и первичная migration matrix.
- Выполнена глубокая инвентаризация Owner Control Center: Overview, Ideas, Projects, формы, детали, архивы, статусы, приоритеты, pin, long-press/context-menu, keyboard и мобильная навигация.
- Составлена карта Auth/register/callback/password recovery/account settings и legacy URL contracts.
- Проанализированы текущие Application-to-Supabase зависимости.
- Проанализированы checked-in SQL migrations для ideas, projects extensions, private registry RLS/grants; ограничения аудита live schema задокументированы.
- Выявлены риски согласованности при launch idea → project и delete project → restore idea.
- Результаты зафиксированы в `docs/architecture/deep-functional-and-data-migration-map-2026-11-05.md` и changelog.

## 5. Критический блокирующий вопрос

**ADR-002 — frontend stack — остаётся PROPOSED.** Рекомендация: Vue 3 + TypeScript + Vite 8.x + Vue Router 5.x; Domain/Application должны оставаться framework-independent.

До явного утверждения стека нельзя устанавливать зависимости, создавать app/build configuration или начинать прикладную SPA-реализацию. Остальной аудит, проектирование маршрутов, data contracts и миграционная подготовка могут продолжаться.

ADR-003 (state management) и ADR-004 (testing) также остаются proposed и должны быть согласованы с окончательным stack. Pinia — условный вариант только при выборе Vue.

## 6. Следующие этапы после принятия ADR-002

1. Зафиксировать frontend stack и совместимые версии Node/Vite/framework/router.
2. Создать package/build configuration и единственный SPA entry point в утверждённом временном GitHub Pages + Hash Router режиме.
3. Реализовать app composition root, centralized route registry и layouts четырёх пространств.
4. Вынести Supabase access в Infrastructure adapters; Application use cases не должны напрямую импортировать Supabase client.
5. Мигрировать Auth и recovery flows с проверкой callback URL/allowlist в изолированной среде.
6. Мигрировать Owner Control Center shell, Overview, Ideas, Projects и все существующие действия.
7. Мигрировать account settings, публичные страницы и legal content.
8. Обеспечить совместимость старых URL через redirects/entry shims там, где это необходимо.
9. Удалять legacy HTML/CSS/JS implementations только после parity verification.
10. Выполнить automated unit/integration/route/browser tests и критические проверки на реальном iOS Safari.
11. Обновить migration matrix, changelog, repository structure и финальный diff report.

## 7. Требования к готовности merge candidate

- SPA реально запускается и собирается; MPA больше не является целевой архитектурой.
- Все подтверждённые существующие функции сохранены либо их изменение отдельно согласовано.
- Нет inline CSS/JS в целевых HTML entry points; CSS не встроен в JS/TS.
- Domain/Application не зависят от UI framework, DOM или Supabase SDK.
- Маршруты, redirects, callbacks, recovery, refresh/back/forward работают в согласованном режиме.
- Owner, Partner и External Project access controls проверяются на backend; UI guards не считаются security boundary.
- Supabase schema/RLS/grants проверены; production не менялся без отдельного разрешения.
- Есть автоматизированные проверки, тесты отказов/конкурентности и iOS Safari verification.
- Сверен полный diff относительно актуального main, исключены deploy side effects.
- Подготовлены rollback notes и merge summary.
- Владелец отдельно просмотрел результат и дал разрешение на merge.

## 8. Текущий статус

**Подготовка:** IN PROGRESS.  
**Функциональная инвентаризация:** статически выполнена для текущего Owner Control Center, Auth и Account Settings; другие публичные страницы и inline scripts ещё требуют полного route/content mapping.  
**Frontend stack:** BLOCKED — ожидает утверждения ADR-002.  
**SPA implementation:** NOT STARTED.  
**Merge readiness:** NOT READY.  
**Merge to main:** NOT PERFORMED; отдельное разрешение владельца обязательно.
