# Changelog: ADR-002 Frontend Stack

**Дата:** 05.11.2026  
**Рабочая ветка:** architecture/spa-rewrite-2026-11-05  
**Документ:** docs/architecture/decisions/adr-002-frontend-stack.md  
**Статус ADR:** PROPOSED

## Зафиксировано

Проведено сравнение:
- Native ES Modules без framework/build tool;
- Native ES Modules + Vite без UI framework;
- React + Vite;
- Vue 3 + Vite;
- Svelte 5 + Vite.

Предварительно рекомендован стек Vue 3 + TypeScript + Vite 8.x + Vue Router 5.x. Domain и Application должны оставаться framework-independent. CSS-in-JS не является обязательным или рекомендуемым способом организации стилей.

Обоснование учитывает четыре пространства платформы, модульную архитектуру, TypeScript contracts, официальный Router, route-level lazy loading, статическую сборку, мобильный Safari и стоимость сопровождения.

Отдельно зафиксировано:
- Router history mode зависит от hosting decision ADR-001;
- Cloudflare Pages не считается утверждённым production hosting;
- SEO/prerender для Public routes требует отдельной оценки;
- Vue Router 5 следует использовать без experimental APIs;
- конкретные версии и lockfile фиксируются только при реализации после утверждения.

## Границы изменений

- Добавлен только ADR-002, обновлена таблица unresolved decisions в основной спецификации и добавлен этот changelog.
- Прикладной код, package manifests, build configuration, tests и runtime files не изменялись.
- main, backup branch и raymondovich.online не затрагивались.
- Production Supabase/Auth/data/RLS/grants, DNS, Cloudflare, GitHub Pages и hosting не изменялись.
- Пакеты не устанавливались; proof-of-concept и deployment не выполнялись.
