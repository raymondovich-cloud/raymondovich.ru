# Подготовка Vite production deployment workflow

**Дата:** 06.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

- Добавлен manual-only workflow `.github/workflows/pages-vite-deploy.yml`.
- Build job выполняет install, unit tests, Vite build, build smoke и browser E2E.
- Artifact для GitHub Pages формируется только из `dist/`.
- Deploy job ограничен `main` и требует отдельного boolean подтверждения.
- Автоматический deploy при push/merge отсутствует.
- Создан кандидатный production cutover plan с последовательностью переключения Pages source и rollback.
- GitHub Pages settings, DNS, Cloudflare и production deployment не менялись.
