<!-- version 1.0-draft -->

# Final Repository Structure — Raymondovich.ru

**Статус:** PROPOSED — целевая карта ответственности для review; не разрешение на физическое создание/перенос файлов  
**Дата:** 05.11.2026  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**Основная спецификация:** `docs/architecture/spa-rewrite-specification.md`  
**Связанные решения:** ADR-001 частично утверждён (временный GitHub Pages + Hash Router); ADR-002–004 остаются PROPOSED.

> Документ задаёт целевое распределение ответственности. Он не является командой немедленно создать все каталоги. Framework/toolchain ADR-002–004 остаются PROPOSED. Vue/Vite/Pinia/Vitest/Playwright-пути являются условными. Создавать только каталоги с реальными файлами; пустые директории не коммитить.

## 1. Принципы

1. Один repository, одно SPA и четыре пользовательских пространства под одной архитектурной крышей: Public, Owner Control Center, Partner Workspace, External Project Workspace.
2. Modular Monolith: функциональные модули имеют собственную ответственность и публичные контракты; микросервисы не требуются.
3. Clean Architecture / DDD: Domain не зависит от UI, браузера, Supabase SDK или инфраструктурных адаптеров.
4. Направление зависимостей внутрь: Presentation → Application → Domain; Infrastructure реализует порты Application, но внутренние слои не импортируют Infrastructure.
5. Межмодульный доступ — только через public API модуля или явно определённый application contract.
6. Один HTML entry point `index.html`; внутренние экраны являются SPA routes.
7. Shared/Core не становятся свалкой несвязанных helpers.
8. Design System не импортирует бизнес-модули.
9. Секреты и server-only credentials не помещаются в source, public assets, build output или Git history.
10. Структура не зависит от hosting provider.
11. Функции и файлы не удаляются до inventory, mapping, parity tests и согласования.
12. Не создавать пустые папки, заглушки и speculative modules.

## 2. Целевая структура репозитория

```text
/
├── index.html                         # единственная HTML-точка входа SPA
├── public/                            # только публичные неизменяемые assets
│   ├── favicon/
│   ├── images/
│   └── fonts/
├── source/                            # сохраняет текущую корневую конвенцию source/
│   ├── app/                           # composition root и bootstrap
│   │   ├── bootstrap/
│   │   ├── composition/
│   │   ├── router/
│   │   │   ├── route-registry/
│   │   │   ├── guards/
│   │   │   └── adapters/              # hash/history; mode через ADR
│   │   ├── layouts/
│   │   └── error-boundaries/
│   ├── core/                           # стабильные технические primitives
│   │   ├── contracts/
│   │   ├── errors/
│   │   └── types/
│   ├── domain/                         # framework-independent business model
│   │   ├── identity/
│   │   ├── account/
│   │   ├── participation/
│   │   ├── permissions/
│   │   ├── projects/
│   │   ├── partnerships/
│   │   └── shared-kernel/
│   ├── application/                    # use cases, orchestration, ports
│   │   ├── identity/
│   │   ├── workspaces/
│   │   ├── ideas/
│   │   ├── projects/
│   │   ├── partnerships/
│   │   ├── notifications/
│   │   ├── audit/
│   │   └── ports/
│   ├── infrastructure/                 # adapters implementing ports
│   │   ├── supabase/
│   │   │   ├── client/
│   │   │   ├── repositories/
│   │   │   ├── auth/
│   │   │   └── rpc/
│   │   ├── network/
│   │   ├── telemetry/
│   │   └── integrations/
│   ├── modules/                        # feature modules with explicit public APIs
│   │   ├── public/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── routes/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── routes/
│   │   ├── owner-control-center/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── ideas/
│   │   │   ├── projects/
│   │   │   ├── ecosystem/
│   │   │   └── routes/
│   │   ├── partner-workspace/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── project-overview/
│   │   │   ├── tasks/
│   │   │   ├── files/
│   │   │   ├── discussions/
│   │   │   └── routes/
│   │   └── external-project-workspace/
│   │       ├── api/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── project-overview/
│   │       ├── tasks/
│   │       ├── files/
│   │       ├── discussions/
│   │       └── routes/
│   ├── design/                         # framework-neutral design system assets
│   │   ├── tokens/
│   │   ├── foundations/
│   │   ├── components/
│   │   └── patterns/
│   ├── presentation/                   # transitional/shared presentation only
│   └── memory/                         # retain only after ownership audit
├── tests/
│   ├── unit/
│   ├── component/
│   ├── application/
│   ├── integration/
│   ├── router/
│   ├── e2e/
│   ├── architecture/
│   ├── fixtures/
│   └── support/
├── supabase/                           # only resources owned by this repository
│   ├── migrations/
│   ├── functions/
│   └── tests/
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── changes/
│   ├── operations/
│   └── product/
├── scripts/
├── .github/
│   └── workflows/                      # after CI/CD approval
├── .env.example                        # names/placeholders only
├── package.json                        # after toolchain approval
├── package-lock.json                   # only if npm is selected
├── tsconfig.json                       # if TypeScript is approved
├── vite.config.ts                      # only if Vite is approved
└── README.md
```

Это концептуальное дерево, не физический checklist. Папки создаются только вместе с реальными файлами. Не создавать `supabase/functions/`, `memory/`, `presentation/` или будущие feature folders пустыми; часть текущих каталогов может быть сохранена, объединена или выведена из эксплуатации только после mapping.

## 3. Четыре пространства и владение модулями

| Пространство | Ответственность | Граница доступа |
|---|---|---|
| Public | Презентация экосистемы, продуктов, собственных/партнёрских/допущенных сторонних проектов, условий сотрудничества | Публичное чтение; нет приватных записей и административных операций |
| Owner Control Center | Управление идеями, проектами, партнёрами, допуском сторонних проектов, ролями, конфигурацией и экосистемой | Явные owner/admin permissions, проверяемые backend |
| Partner Workspace | Совместная работа партнёров над проектами, к которым они подключены | Активное участие + project-scoped permissions |
| External Project Workspace | Работа с допущенными сторонними проектами и их участниками | Допуск/договорный статус + членство + scoped permissions |

Это не четыре приложения. Это композиция маршрутов, layouts и feature modules в одной SPA с общей identity, authorization, design system и infrastructure.

Owner Control Center — административная композиция, а не владелец внутренней реализации Ideas/Projects/Partnerships. Он вызывает их публичные use cases. Самостоятельная публикация сторонних проектов посетителями не предполагается: admission контролируется владельцем и согласованным процессом.

## 4. Module public API

Каждый модуль предоставляет узкий публичный entry point, концептуально `modules/<module>/api/index`. Другие модули импортируют только его и документированные типы/контракты.

Публичный API может содержать route contribution, публичные UI entry points, use-case фасады, стабильные domain types и явно документированные события.

Публичный API не должен раскрывать внутренние компоненты, private stores, SDK clients, детали таблиц БД или изменяемое внутреннее состояние.

Межмодульные операции обычно проходят через Application use cases. События — для уведомлений/слабосвязанной реакции, а не вместо явных request/response операций. Глобальный event bus не вводится без доказанного сценария.

## 5. Dependency direction

Разрешено:
- App composition импортирует public APIs модулей и Infrastructure adapters.
- Presentation модуля зависит от собственного Application API, shared UI и Design System.
- Application зависит от Domain и объявленных ports.
- Infrastructure реализует ports и использует внешние SDK.
- Domain зависит только от Domain primitives/shared kernel.
- Design System не зависит от бизнес-модулей.

Запрещено:
- Domain → Application/Presentation/Infrastructure/Supabase/DOM.
- Application → Supabase SDK, DOM или framework runtime.
- Presentation → внутренние файлы соседнего модуля или Infrastructure internals.
- Module A internals → Module B internals.
- Design System → workspace/business modules.
- циклические зависимости и импорт секретов в client source.

Конкретный enforcement tool выбирается после ADR-002/004. Архитектурные границы должны проверяться автоматически, не только code review.

## 6. State ownership

- URL: активный маршрут и адресуемое состояние (фильтры, pagination).
- Application/session: identity summary, active workspace и межмаршрутная координация с явным владельцем.
- Module: состояние внутри функционального модуля.
- Component: ephemeral UI state.
- Server: persistent business data и authorization truth.
- Browser persistence: только после определения категории данных, цели, срока хранения и threat assessment; никаких секретов и чувствительных токенов в самодельном persistence.

При logout/account switch/project switch очищаются user/project-scoped cache, subscriptions и временное состояние до отображения нового контекста. Pinia — только условный ADR-003 кандидат при одобрении Vue, а не архитектурная зависимость.

## 7. Routing and hosting boundary

Временная среда разработки утверждена владельцем: GitHub Pages + Hash Router. Пример URL: `/#/owner/projects`. Это позволяет не требовать server rewrites от GitHub Pages. Route definitions централизованы; разбор маршрута изолирован за Router adapter.

Production hosting и production URL mode не выбраны. При последующем переходе на hosting с поддержкой rewrites можно отдельно принять History API mode. Изменение режима требует тестов direct entry, refresh, Back/Forward, query/hash, legacy URLs и Auth callbacks.

GitHub Pages раздаёт статические assets и не выполняет server-side authorization, private key storage, Supabase service-role operations, server functions или background jobs. Серверные секреты хранятся только в backend secret store (для существующих Supabase Edge Functions — Supabase project secrets). Публичный Supabase anon/publishable key допустим в браузере только при корректной RLS и least-privilege policy; сам по себе ключ не является авторизацией.

## 8. Configuration, secrets and environments

- `.env.example` содержит только имена переменных и безопасные placeholders.
- Local/Development, Staging и Production имеют раздельные конфигурации и credentials.
- Browser-exposed variables должны быть явным allowlist и считаются публичными.
- Service-role keys, DB passwords, signing secrets, private API keys и access tokens не коммитятся, не встраиваются в source и не попадают в client build/logs.
- Server-only values хранятся в backend provider secret store; CI secrets ограничиваются минимальным scope и никогда не печатаются.
- Документ не создаёт и не меняет фактические secret values.

## 9. Build, tests and deployment

Build output (например, `dist/` при Vite) — генерируемый артефакт, не source of truth. Его не коммитить, если отдельная утверждённая deployment-модель не требует обратного.

Временная публикация: GitHub repository остаётся source of truth; на GitHub Pages публикуются только статические build artifacts. Настройка workflow/Pages выполняется отдельно и не подразумевается данным документом. Никакие DNS, production Supabase, Cloudflare или production settings не меняются.

Production provider остаётся открытым. До production — staging validation, owner approval, rollback plan и artifact provenance.

Test layers:
- unit — чистые Domain/Application functions;
- component — UI contracts, accessibility, loading/error states;
- application — use-case orchestration with fake ports;
- integration — реальные adapters на isolated backend;
- router — route registry, guards, URL sync, Hash/History mode, lifecycle;
- e2e — критические journeys четырёх пространств;
- architecture — forbidden imports, public API boundaries, cycle detection;
- fixtures/support — только synthetic data и test utilities.

Тесты не обращаются к production user data. RLS tests используют isolated backend и synthetic identities. Реальный iOS Safari остаётся manual gate для критических mobile flows. Точный toolchain — после ADR-004.

## 10. Documentation ownership

- `docs/architecture/`: нормативная архитектура и structure map.
- `docs/architecture/decisions/`: ADR со статусом, контекстом, решением, последствиями и критериями пересмотра.
- `docs/changes/`: dated change records.
- `docs/operations/`: runbooks deployment, backup/restore, incidents, secrets rotation и rollback после их подтверждения.
- `docs/product/`: продуктовые требования и пользовательские сценарии.
- `README.md`: назначение репозитория, setup, команды и ссылки на governing docs.

Runbooks обязаны различать проверенные процедуры и proposed procedures. Не публиковать secrets/private personal data/production access details.

## 11. Mapping from current repository

Текущий аудит описывает несколько HTML entry points и существующий `source/` со слоями core/domain/application/infrastructure/presentation/memory/design. Миграция проводится по ответственности, не механическим rename.

| Текущая область | Целевая область | Правило |
|---|---|---|
| Root HTML files | Один `index.html` + module routes/pages | Сначала mapping всех URL и поведения |
| `source/core/` | `source/core/` | Оставить стабильные framework-independent primitives |
| `source/domain/` | `source/domain/` | Проверить чистоту Domain и ownership |
| `source/application/` | `source/application/` | Явные use cases и ports |
| `source/infrastructure/` | `source/infrastructure/` | Изолировать Supabase/HTTP/external adapters |
| `source/presentation/` | `source/modules/`, `source/app/`, shared presentation | Разделить по workspace/feature и public APIs |
| `source/design/` | `source/design/` | Разделить tokens, primitives, patterns |
| `source/memory/` | Unresolved | Классифицировать по фактическому назначению; не переносить вслепую |
| SQL migrations | `supabase/migrations/` only if repo ownership confirmed | Историю сохранять; не менять production schema |
| Existing docs | `docs/` | Обновлять ссылки, архивировать устаревшие решения без потери evidence |

Фактический список файлов определяется current-state audit. Здесь не утверждается, что целевые модули уже существуют.

## 12. Migration sequence

1. Владелец рассматривает архитектуру и unresolved ADR.
2. Завершить functional inventory и route/legacy URL compatibility map.
3. Утвердить frontend stack, build tool, Router library/mode и test tooling.
4. Создать минимальный app shell и один vertical slice в изолированной ветке.
5. Добавить architecture boundary checks и CI до широкой миграции.
6. Переносить по одному функциональному вертикальному срезу, сохраняя поведение и тесты.
7. Проверить Auth callback/recovery и permissions на isolated backend.
8. Перенести остальные модули и четыре workspace.
9. Проверить accessibility, mobile Safari, performance и failure/recovery.
10. Staging acceptance и owner review.
11. Production hosting, DNS и deployment — только отдельное решение и approval.

До прямого разрешения владельца implementation stages не начинаются.

## 13. Unresolved decisions / no authorization

Открыты: ADR-002 frontend framework/build stack; ADR-003 state library; ADR-004 test/CI tooling; production hosting и route mode; public SEO rendering; Ideas/Projects domain lifecycle/cardinality; ownership Supabase migrations/functions; CI/staging credentials; фактические backup/restore, monitoring, SLO/RPO/RTO.

Документ не разрешает package installation, folder migration, code changes, file deletion, SQL/schema/RLS/grants changes, Edge Functions changes, DNS/Cloudflare/hosting changes, production deployment, merge to `main` или любые действия в `raymondovich.online`.
