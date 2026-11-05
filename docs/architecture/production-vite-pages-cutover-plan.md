# Кандидатный план production-публикации Vite через GitHub Pages

**Статус:** PROPOSED — не утверждён владельцем  
**Дата:** 06.11.2026  
**Репозиторий:** `raymondovich-cloud/raymondovich.ru`  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`

## 1. Текущее состояние

Read-only проверка production evidence показывает:

- Действующий GitHub Pages pipeline использует GitHub-managed Jekyll build.
- Production custom domain хранится в корневом `CNAME` со значением `raymondovich.ru`.
- Новая корневая `index.html` — Vue SPA entry, которая требует Vite bundling.
- Сырые bare imports `vue` и `vue-router` не могут быть опубликованы как необработанный root HTML.
- Vite собирает готовый статический сайт в `dist/`.
- Hash Router выбран для временной GitHub Pages среды, поэтому для клиентских SPA routes не нужен серверный History API fallback.
- Старые HTML URL остаются отдельными Vite build entries и выполняют redirect handoff.

Прямой merge при сохранённом Jekyll publishing source не считается безопасным.

## 2. Кандидатное решение

Сохранить GitHub Pages как текущий hosting provider, но заменить publishing source с branch/Jekyll на GitHub Actions artifact, собранный Vite.

Это **техническая рекомендация**, а не утверждённое решение о долгосрочном commercial hosting. Cloudflare Pages остаётся альтернативным кандидатом и не считается выбранным.

### Требования к артефакту

Production artifact должен включать:

- Vite-bundled `dist/index.html` и hashed JS/CSS assets;
- legacy HTML entries для старых внешних URL и Supabase Auth bridges;
- `robots.txt` и `sitemap.xml`;
- `CNAME` со значением `raymondovich.ru`.

Для сохранения custom domain добавлен `public/CNAME`; build smoke test проверяет, что `dist/CNAME` совпадает с исходным файлом.

### Подготовленный workflow

`.github/workflows/pages-vite-deploy.yml`:

- запускается только вручную через `workflow_dispatch`;
- выполняет `npm ci`, unit tests, Vite build, build smoke и browser E2E;
- загружает только проверенный каталог `dist/` как Pages artifact;
- deployment job запускается только при выборе ветки `main` и явном boolean подтверждении `confirm_production=true`;
- не содержит автоматического deployment на push или merge.

Вызов workflow на migration branch может проверить build job, но deploy job будет пропущен. Production deployment не запускался.

## 3. Требуемая последовательность cutover

Только после отдельного одобрения владельца:

1. Получить зелёный CI на окончательном migration HEAD и завершить PR review.
2. Убедиться, что Pages artifact содержит все необходимые legacy entries, assets и `CNAME`.
3. В GitHub repository Settings → Pages изменить publishing source на **GitHub Actions**. Это production setting change и требует отдельного одобрения.
4. Выполнить согласованное слияние PR.
5. Вручную запустить `Manual Vite production deployment` на `main`, подтвердив `confirm_production`.
6. Проверить homepage, custom domain, TLS, robots/sitemap, legacy URLs, auth callback/recovery bridges, refresh и Owner access.
7. Зафиксировать deployed commit, workflow run и результаты smoke verification.

До шага 3 текущая Jekyll-публикация не должна считаться совместимой с новой SPA. Само добавление workflow не переключает Pages source.

## 4. Rollback

До cutover необходимо зафиксировать последний рабочий Pages deployment и commit старого сайта.

Если после Vite deployment обнаружится критическая ошибка:

- остановить повторные production deployments;
- восстановить предыдущий проверенный сайт revert-коммитом, возвращающим старую root-структуру, либо повторной публикацией заранее сохранённого рабочего artifact;
- при возврате к branch-based Pages publishing source повторно включить Jekyll только после проверки восстановленного дерева;
- не менять DNS/Cloudflare в рамках rollback без отдельного решения.

Rollback rehearsal пока не выполнялся.

## 5. SEO и routing ограничения

- Hash Router сохраняет надёжную маршрутизацию на статическом hosting.
- Hash routes не являются самостоятельными server-rendered URL для поисковых роботов.
- Текущий sitemap намеренно содержит только canonical homepage.
- Prerender/SSR и полноценный route-level SEO остаются отдельным решением; этот deployment workflow их не реализует.

## 6. Границы

- Workflow подготовлен, но не запускался.
- GitHub Pages publishing source не менялся.
- Production deployment не выполнялся.
- DNS, Cloudflare и custom-domain settings не менялись.
- Supabase/Auth/RLS/grants и production data не изменялись.
- PR не сливался.
