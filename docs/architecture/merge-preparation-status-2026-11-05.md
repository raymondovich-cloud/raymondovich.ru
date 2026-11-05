# Подготовка переноса SPA-архитектуры в main

**Актуализация:** 05.11.2026  
**Репозиторий:** `raymondovich-cloud/raymondovich.ru`  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**Целевая ветка:** `main`  
**Последний подтверждённый base SHA:** `89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4`

## 1. Границы изменений

Работа выполнялась только в migration branch. `main`, backup branch, `raymondovich.online`, production Supabase/Auth/data/RLS/grants/Edge Functions, DNS, Cloudflare settings, hosting и deployment не изменялись.

Слияние и production deployment не выполнялись. Hash Router разрешён ADR-001 только для временной тестовой среды.

## 2. Реализовано в рабочей ветке

### SPA и public routes

- `index.html` — единственная точка входа Vue SPA.
- Vue 3.5.45, Vue Router 5.4.0, Vite 8.3.6; JavaScript ES modules. TypeScript не внедрён.
- `spa.html` — noindex compatibility handoff, не вторая SPA.
- Старые публичные URL перенаправляются в SPA через общий redirect module и route aliases.
- Query parameters legacy URL переносятся в Router query; anchor fragments сохраняются.
- Реализованы Home, Products, Cooperation, About, Profile, Settings и Legal views.
- Утверждённые формулировки блока «Три формата развития проектов» сохранены без изменений.

### Authentication и account

- Старые Supabase Auth callback и password recovery HTML bridges сохранены для совместимости с текущими redirect URL и implicit token fragments.
- Callback use case поддерживает PKCE query code и implicit token-fragment session.
- После подтверждения email выполняется profile provisioning; admin направляется в Owner Control Center, обычный пользователь — на public home.
- Реальный Supabase email confirmation, password recovery, session restoration и redirect allow-list не проверялись end-to-end.

### Owner Control Center

- Реализованы Overview, Ideas и Projects.
- Router routes: `/owner`, `/owner/ideas`, `/owner/projects`; Back/Forward отражают переключение разделов.
- Перенесены создание/редактирование идей, статусы, приоритеты, архив/восстановление, запуск идеи в проект, pin, pause/resume, complete, delete и контекстные действия.
- Application services не импортируют Supabase SDK; Infrastructure adapters подключаются через `source/presentation/runtime/`.
- Domain rules для Ideas/Projects вынесены в Domain layer.
- Launch/delete workflows используют компенсационные запросы, а не одну серверную транзакцию; concurrent/partial failure cases покрыты unit-level проверками, но не заменяют реальную DB transaction.

### Partner и External spaces

- Маршруты и placeholder views существуют.
- **Partner Workspace и External Project Workspace не являются рабочими кабинетами.** Membership/data models и project-scoped authorization не реализованы.
- Read-only schema inspection не обнаружила partner/external/member/workspace tables.

## 3. Архитектура и зависимости

- Domain → без зависимостей от Application, Infrastructure или Presentation.
- Application зависит от Domain и внедряемых ports/contracts; не импортирует Infrastructure.
- Infrastructure реализует gateways/repositories.
- Presentation runtime является composition root.
- Архитектурные тесты запрещают нарушения dependency boundaries и Vue `:style` bindings.
- Pinia не используется; ADR-003 остаётся PROPOSED. URL state принадлежит Router, ephemeral UI state — views, persistent business data — Supabase.
- ADR-004 остаётся PROPOSED: unit/architecture baseline использует встроенный Node.js `node:test`; Vitest и Vue Test Utils не внедрены. Playwright 1.64.1 добавлен для Chromium и WebKit iPhone emulation; браузерный CI пока не получил подтверждённый green run на актуальном HEAD.

## 4. CI и тесты

Последний подтверждённый полный pipeline:
- Workflow run: `42105900028`.
- Executable code/test commit: `4b9ca6b65a2b80e6ff1080ef5c02214763d562f2`.
- `npm ci --ignore-scripts --no-audit --no-fund`: SUCCESS.
- `npm test`: **56 passed, 0 failed**.
- `npm run build`: SUCCESS.
- `npm run test:build`: SUCCESS.
- Build smoke проверяет root SPA, legacy redirects, Auth bridges, route registry, crawler assets и architecture boundaries.
- Migration contract tests проверяют 14-file inventory, admin function ACL lock, project RLS/grants, seed contracts, transaction boundaries и destructive-DDL guard.

После этого executable commit добавлялись документационные изменения. Обязателен новый успешный CI на точном финальном HEAD перед PR review.

## 5. Supabase migration parity

- Live production schema/migration history проверялись read-only; DDL/DML не выполнялись.
- Четыре отсутствовавшие migration files восстановлены из `supabase_migrations.schema_migrations.statements`.
- Project extension migration filename приведён к live version `20261104131912`.
- Все **14** файлов `supabase/migrations/*.sql` сравнены с live migration ledger: version/name совпадают, SQL statement differences — **0**.
- Live policies для ideas/projects/user_profiles теперь представлены в checked-in migrations.
- Clean local Supabase replay ещё не выполнялся: seed migrations требуют изолированных fixtures (admin owner и проект LifeGame).

### Live RLS/grants findings

- RLS включён на `ideas`, `projects`, `user_profiles`; FORCE RLS выключен.
- Ideas/projects policies требуют admin app_metadata role и совпадающий owner_id.
- User profiles policies ограничивают доступ собственным user_id.
- У роли `anon` обнаружены широкие grants на `ideas`, включая TRUNCATE. RLS не защищает TRUNCATE; требуется отдельное security remediation.
- У `projects` anon grants не обнаружены.
- `promote_raymondovich_admin(text)` — SECURITY DEFINER; anon/authenticated не имеют EXECUTE.
- Security Advisor сообщает **Leaked Password Protection Disabled**.
- Ни grants, ни RLS, ни Auth settings не менялись.

## 6. Production hosting / deployment gate

Read-only Cloudflare/DNS inspection:

- Cloudflare Pages project list в подключённом аккаунте пуст.
- Apex A records `raymondovich.ru` указывают на GitHub Pages IP `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; записи DNS-only.
- `www.raymondovich.ru` — DNS-only CNAME на `raymondovich-cloud.github.io`.
- В репозитории нет `gh-pages` branch и repository-authored deploy workflow. Зафиксирован GitHub-managed Pages run `42106930006` на `main` commit `c2a495be2cb995c40cf4ab540b00c5b6aae3581c`: checkout `main` → `actions/jekyll-build-pages@v1` → upload artifact → `Deploy to GitHub Pages` SUCCESS. Triggering commit менял только `.gitignore`.

Наблюдаемый production pipeline собирает `main` через Jekyll и не выполняет Vite / не публикует `dist/`. Новый root `index.html` SPA загружает `main.js` с bare imports `vue`/`vue-router`; без Vite bundle это нерабочая production entry. **Прямой merge root cutover в текущий Pages pipeline ожидаемо сломает сайт.** До merge требуется отдельное утверждение production build/deployment migration и явное разрешение владельца на cutover.

## 7. Оставшиеся проверки и решения

1. Browser E2E: direct routes, refresh, Back/Forward, legacy redirects, Auth flows.
2. Реальная проверка критических сценариев в iOS Safari; WebKit iPhone emulation не заменяет устройство.
3. Проверка Supabase Auth redirect allow-list и email templates.
4. Clean local Supabase migration replay с isolated fixtures.
5. Отдельное решение о Partner/External scope: реализовать backend membership/authorization либо явно отложить эти пространства.
6. Рассмотреть revoke избыточных anon grants на `ideas` и включение Leaked Password Protection — только после отдельного разрешения и тестирования.
7. Утвердить production hosting/routing/SEO и фактический Pages publishing source.
8. Получить зелёный CI на точном финальном HEAD.
9. Создать PR, проверить mergeability и повторно сравнить branch с актуальным `main`.

## 8. Git состояние и merge strategy

На последнем подтверждённом сравнении перед этим обновлением:
- `main`: `89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4`.
- Migration branch: **408 commits ahead, 0 behind**.
- Changed paths: **146**.

Точные значения необходимо обновить непосредственно перед PR. Из-за большого количества последовательных migration commits рекомендуется **Squash merge**, чтобы не переносить сотни технических commit entries в историю `main`.

## 9. Итоговый статус

- SPA foundation: IMPLEMENTED IN MIGRATION BRANCH.
- Public views: IMPLEMENTED; route-level SEO/browser validation remains.
- Owner Control Center: IMPLEMENTED; browser/iOS validation remains.
- Auth/account: MIGRATED WITH LEGACY BRIDGES; real Supabase E2E remains.
- Partner Workspace: PLACEHOLDER — NOT OPERATIONAL.
- External Project Workspace: PLACEHOLDER — NOT OPERATIONAL.
- Supabase migration source parity: 14/14 EXACT; clean local replay remains.
- Automated CI: GREEN on tested executable commit; exact final HEAD must be rechecked.
- Production cutover: NOT APPROVED.
- Merge to main: NOT PERFORMED.

**Conclusion:** executable SPA migration is prepared and automated checks are green, but the branch is not approved for production merge. Production hosting/routing, Partner/External scope and security findings require explicit owner decisions. No production or main changes have been made.


## Playwright browser verification — 2026-11-05

- Added pinned `@playwright/test@1.64.1` and its locked dependency graph.
- CI runs Node unit tests, Vite build, build smoke checks, installs Chromium/WebKit, then runs Playwright.
- Projects: desktop Chromium and iPhone 13 WebKit emulation.
- Browser scenarios include public routes and approved cooperation copy, legacy route/query/anchor handoff, Back navigation, Owner authorization, auth form error/recovery/registration, crawler assets and horizontal overflow.
- Current verification gate: run `42107424678`, HEAD `2a71f1d29e7537b0065011c7e5c6ebaaaf7895e9`; pending at the time of this update. Do not mark E2E complete until this and any subsequent final-head run succeeds.
- WebKit device emulation is not a substitute for manual testing on the owner's actual iPhone Safari.
