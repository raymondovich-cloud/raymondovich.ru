# Целевая структура репозитория Raymondovich.ru

**Статус:** PROPOSED — архитектурная схема для review; не разрешение на физическое создание/перенос файлов.  
**Дата:** 05.11.2026  
**Рабочая ветка:** architecture/spa-rewrite-2026-11-05  
**Основная спецификация:** docs/architecture/spa-rewrite-specification.md  
**Связанные ADR:** ADR-001, ADR-002, ADR-003, ADR-004 — все требуют отдельного утверждения.

## 1. Назначение

Документ фиксирует целевое распределение ответственности в репозитории после перехода с MPA на SPA. Это не механический перенос существующего дерева и не команда немедленно создавать все каталоги.

Основные правила:
- одна основная HTML-точка входа SPA — index.html;
- приложение — Modular Monolith;
- функциональные модули имеют внутренние domain/application/infrastructure/presentation слои по необходимости;
- межмодульное взаимодействие — только через public API/contracts;
- Composition Root связывает зависимости;
- Router не содержит бизнес-логику и не обращается к Supabase;
- общая Infrastructure не дублируется;
- пустые папки, заглушки и фиктивные модули не создаются;
- физическая структура формируется после утверждения ADR и mapping функциональности.

## 2. Предлагаемое дерево

Технологически нейтральные границы:

```text
/
├── index.html
├── public/
│   ├── favicon/
│   ├── images/
│   ├── manifest.webmanifest        # если потребуется
│   ├── robots.txt                  # после SEO review
│   └── sitemap.xml                 # после SEO review
├── source/
│   ├── app/
│   │   ├── bootstrap/              # startup sequence
│   │   ├── composition/            # Composition Root / DI
│   │   ├── router/                 # Router + route registry
│   │   └── layouts/                # Public/Auth/Owner/Partner/External
│   ├── modules/
│   │   ├── identity/
│   │   ├── account/
│   │   ├── public-site/
│   │   ├── owner-control-center/
│   │   ├── ideas/
│   │   ├── projects/
│   │   ├── products/
│   │   ├── partnerships/
│   │   └── external-projects/
│   ├── core/
│   │   ├── contracts/
│   │   ├── errors/
│   │   └── types/
│   ├── infrastructure/
│   │   ├── supabase/               # shared client/bootstrap only
│   │   ├── network/
│   │   ├── telemetry/
│   │   └── storage/                # only if file/object storage is adopted
│   ├── design/
│   │   ├── tokens/
│   │   ├── foundations/
│   │   ├── components/
│   │   └── layouts/
│   └── shared/                     # only proven cross-module technical code
├── tests/
│   ├── integration/
│   ├── e2e/
│   ├── architecture/
│   ├── fixtures/
│   └── support/
├── supabase/
│   ├── migrations/
│   └── functions/                  # only actual Edge Functions
├── docs/
│   ├── architecture/
│   │   └── decisions/
│   ├── security/
│   ├── changes/
│   └── ...
├── .github/
│   └── workflows/                  # after CI/CD decision
├── package.json                    # after frontend/toolchain approval
├── lockfile                        # matching selected package manager
├── build configuration             # only selected toolchain
└── test/lint/type configuration    # only selected tools
```

Это дерево концептуальное. Каталоги, не содержащие реальных файлов, не создаются. Папки favicon/images, storage, telemetry, tests subfolders and future modules may be omitted until needed.

## 3. Ownership of application areas

### 3.1. App layer

- bootstrap: запускает приложение и передаёт управление Composition Root.
- composition: создаёт инфраструктурные адаптеры, связывает ports/use cases и передаёт публичные зависимости модулям.
- router: route registry, matching, navigation, guards for UX, route lifecycle and 404.
- layouts: каркасы четырёх пространств и Auth. Layout не импортирует внутренние реализации модулей.

### 3.2. Functional modules

Предварительные текущие модули:
- identity — auth/session/callback/recovery and access context;
- account — профиль и настройки аккаунта;
- public-site — публичные страницы, legal content and public navigation;
- owner-control-center — owner shell, overview and workspace navigation;
- ideas — idea lifecycle and use cases;
- projects — project lifecycle and use cases;
- products — каталог и presentation of products;
- partnerships — partner participation and project membership;
- external-projects — admitted third-party project workspace and promotion analytics.

Разделение owner-control-center и доменных модулей принципиально: Owner shell не должен владеть внутренними данными Ideas/Projects/Partnerships. Он предоставляет административную композицию и вызывает публичные use cases.

Будущие модули (Portfolio, Finance, Knowledge, Analytics, Applications, Billing, Notifications, Monitoring, Audit, Backup, Tools/Infrastructure) не создаются заранее. Они выделяются только после определения самостоятельной предметной ответственности и реального сценария.

### 3.3. Module internal layout

Модуль получает только необходимые слои:

```text
modules/<module>/
├── domain/             # entities, value objects, invariants
├── application/        # use cases, ports, orchestration
├── infrastructure/     # module-specific repositories/adapters/mappers
├── presentation/       # route pages, components, local styles
├── contracts/          # only if public contracts need separate files
└── index.*             # explicit public API
```

Не создавать пустые domain/application/etc. layers. Для простого модуля допустима более компактная структура, если границы ответственности остаются явными.

Внешние модули импортируют только public entry point. Запрещены импорты вроде modules/projects/infrastructure/... из соседнего модуля.

## 4. Shared infrastructure vs module infrastructure

Общая infrastructure:
- общий Supabase client and safe initialization;
- общие network primitives;
- общая telemetry/logging transport;
- общие технические browser adapters, если есть повторное использование.

Внутри доменных модулей:
- repositories конкретных сущностей;
- DTO ↔ domain/application mapping;
- project-specific query adapters;
- module-specific integrations;
- domain-specific validation and data policies.

Не помещать domain repositories в глобальный infrastructure каталог только ради общей папки.

## 5. Design System

Design System не зависит от бизнес-модулей и не знает таблицы, роли или project permissions.

- tokens — цвета, типографика, spacing, radii, shadows, borders, motion;
- foundations — reset, base styles, typography, accessibility foundations;
- components — buttons, fields, cards, dialogs, menus, feedback states;
- layouts — повторно используемые визуальные композиции, не бизнес workspace logic.

Бизнес-модуль может передавать данные и callbacks, но не делегирует Design System решение о правах или бизнес-переходах. CSS-in-JS не является обязательным. Финальная стратегия CSS зависит от ADR-002 and Design System implementation review.

## 6. Tests placement

- Unit tests могут размещаться рядом с модулем, если это поддержит выбранный toolchain.
- Cross-module integration tests — tests/integration.
- Browser E2E — tests/e2e.
- Architecture boundary tests — tests/architecture.
- Fixtures and helpers — только для повторно используемых test utilities.
- Test helpers не импортируются production кодом.

Не дублировать одни и те же тесты в модуле и общем каталоге. Точный pattern именования определяется ADR-004.

## 7. Root and deployment configuration

Root files are added only after the corresponding ADR:
- package.json and lockfile — after frontend stack and package manager choice;
- Vite config — only if ADR-002 accepted;
- TypeScript config — if TypeScript accepted;
- ESLint/format config — after code quality tool selection;
- test config — after ADR-004;
- .github/workflows — after CI/CD review;
- hosting fallback/redirect config — after ADR-001 and staging verification;
- environment example files — names/placeholders only, no secrets.

Existing CNAME and GitHub Pages related files are not removed or changed until hosting migration is separately approved. Supabase migrations/functions remain separate from frontend build output and are not automatically deployed by the static frontend pipeline.

## 8. Migration mapping

Before moving or deleting any source file, create a file/function mapping with:
- existing file and exported functions;
- current user-visible behaviour;
- target module and layer;
- route/use case;
- dependencies and data contracts;
- migration status;
- test evidence;
- deletion/retirement decision.

Migration statuses: discovered, mapped, implemented, tested, approved for retirement, retired. A file is not deleted merely because a replacement exists; replacement behaviour and data compatibility must be verified first.

## 9. Finalization gates

The tree becomes accepted only after:
1. owner review of ADR-001 and hosting constraints;
2. owner review of ADR-002 frontend/tooling recommendation;
3. owner review of ADR-003 state management;
4. owner review of ADR-004 testing strategy;
5. mapping current inventory into module boundaries;
6. confirming no existing feature or integration is lost;
7. checking that tree contains no speculative empty modules;
8. explicit owner approval.

Until then, this document is a proposed target. It does not authorize physical folder creation, package installation, file deletion, code migration, deployment or production changes.
