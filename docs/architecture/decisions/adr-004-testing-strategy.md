# ADR-004: Testing strategy and quality gates

**Статус:** PROPOSED — рекомендация для рассмотрения владельцем; не утверждено.  
**Дата исследования:** 05.11.2026  
**Область:** только Raymondovich.ru  
**Зависимости:** ADR-002 (Vue 3 + Vue Router 5 + Vite) ACCEPTED WITH SCOPE; ADR-003 (state management) remains PROPOSED.

## 1. Цель

Определить многоуровневую стратегию тестирования для SPA/Modular Monolith, четырёх пользовательских пространств, Supabase backend, RLS authorization, маршрутизации, интеграций и безопасной миграции с MPA.

Тесты должны подтверждать не только то, что интерфейс отображается, но и то, что:
- пользователь не получает чужие данные;
- project scope соблюдается;
- бизнес-операции не оставляют частично записанные данные;
- старые Auth flows и URL не ломаются;
- модули не нарушают архитектурные границы;
- интерфейс работает на мобильных браузерах и с клавиатурой;
- релиз можно безопасно откатить.

## 2. Test pyramid and layers

### 2.1. Unit tests

Проверяют чистую domain/application logic:
- entities, value objects, invariants;
- validation and normalization;
- permissions evaluation logic as pure functions;
- use-case orchestration with fake ports;
- error classification and retry decision logic;
- mapping functions.

Unit tests не должны требовать реальной Supabase или browser runtime, если тестируемая функция этого не требует.

### 2.2. Component tests

Проверяют публичное поведение UI-компонентов:
- props/events/slots and rendered output;
- validation, loading, empty and error states;
- keyboard interaction, focus, aria labels;
- dialogs, menus, forms and touch-related event handling;
- cleanup of timers/subscriptions/listeners.

Если Vue будет утверждён, использовать Vue Test Utils 2 для Vue 3 components вместе с Vitest. Тестировать public component behaviour, а не private implementation details. Не полагаться исключительно на snapshots.

### 2.3. Application/integration tests

Проверяют реальные use cases и адаптеры:
- Application ports and repositories;
- Supabase queries and mapping;
- transaction/RPC behaviour;
- failure of each intermediate step;
- idempotency and duplicate submissions;
- cancellation, stale responses and concurrency;
- RLS and grants with multiple test identities.

Интеграционные тесты выполняются только на изолированном test/staging backend, никогда на production user data.

### 2.4. Router and shell tests

Проверяют:
- direct URL entry;
- refresh on nested routes;
- browser Back/Forward;
- query/hash preservation;
- unknown routes and 404 view;
- auth/permission guards;
- safe redirect targets;
- lazy chunk loading and chunk failure recovery;
- route lifecycle cleanup;
- separation of public/private layouts.

### 2.5. End-to-end tests

Проверяют полные пользовательские сценарии в браузере:
- public navigation and product pages;
- registration/login/logout;
- email callback and password recovery;
- owner access and denial for non-owner;
- ideas/projects CRUD and lifecycle actions;
- project membership/permissions when implemented;
- space switching;
- error/recovery flows;
- legacy URL compatibility.

E2E suite должна оставаться компактной и покрывать критические business journeys, а не повторять все unit tests на UI level.

### 2.6. Architecture tests

Автоматически проверяют:
- Domain does not import Presentation/Infrastructure/browser SDK;
- Application does not import Supabase SDK or DOM;
- Presentation does not import Infrastructure internals;
- modules do not import internal files of neighbour modules;
- no cyclic dependencies;
- module public APIs are respected;
- Design System does not depend on business modules.

Конкретный enforcement tool фиксируется после final toolchain selection. Архитектурные ограничения не должны зависеть только от code review.

### 2.7. Database/migration tests

Для каждой миграции:
- apply on clean test database;
- upgrade from supported prior schema;
- constraints and indexes;
- RLS positive and negative tests;
- grants and role boundaries;
- transaction rollback;
- backward compatibility during staged deployment;
- rollback/forward recovery plan.

Production migrations не тестируются экспериментально на production. Для проверки используются isolated database or disposable staging resources.

### 2.8. Performance and security tests

Проверять критические маршруты и операции:
- initial bundle and lazy chunk sizes;
- route transition latency;
- slow API/database calls;
- concurrent requests and duplicate mutations;
- XSS/input handling and open redirects;
- permission bypass attempts;
- rate-limit behaviour;
- secret leakage in source/build/logs;
- accessibility regressions.

Численные thresholds устанавливаются после baseline measurements.

## 3. Proposed tooling

Conditional on ADR-002 accepting Vue + Vite:

| Area | Proposed tool | Role |
|---|---|---|
| Unit and application tests | Vitest 5.x | Fast runner integrated with Vite |
| Vue component tests | Vue Test Utils 2 | Official Vue 3 component mounting and interaction |
| Browser E2E | Playwright Test | Chromium, Firefox, WebKit and device emulation |
| Accessibility automation | axe-core integration with browser tests | Automated accessibility checks; not a substitute for manual review |
| Static analysis | TypeScript compiler + ESLint | Type and code-quality checks |
| Architecture boundaries | ESLint boundary rules or dedicated dependency graph checker | Forbidden imports and dependency direction |
| DB/RLS integration | Isolated Supabase test project or local Supabase environment | Real PostgreSQL/RLS and migrations |
| Manual device validation | Real iOS Safari on target iPhone | Validate platform-specific behaviour not proven by emulation |

Exact versions must be pinned in lockfile after compatibility check. On the date of research, Vitest documentation lists supported 5.1 and requires Vite >=6.4.0 and Node >=22.12.0; this is compatible at the declared major/minor range with Vite 8, but the exact package matrix must be verified at implementation start.

## 4. Browser matrix and iOS Safari

Playwright supports Chromium, Firefox and WebKit and can emulate mobile device profiles. Playwright WebKit is based on WebKit mainline and is not identical to branded Safari. Therefore:
- automated WebKit is a useful early compatibility gate;
- real iOS Safari testing remains mandatory for critical releases;
- validate touch/pointer interactions, safe areas, keyboard, focus, viewport resize, scroll, history navigation, storage/session lifecycle and lazy chunks;
- maintain a documented minimum iOS version based on real test evidence.

Device emulation is not proof of actual iPhone Safari compatibility.

## 5. Test data and environment safety

- Unit tests use deterministic fixtures/fakes.
- Integration tests use isolated backend resources and synthetic accounts.
- E2E tests use dedicated test identities with minimal permissions.
- Production credentials and user data are prohibited in local/CI tests.
- Test data must be reset or uniquely namespaced between runs.
- Tests that send email/Telegram/payment side effects must use mocks or controlled test endpoints.
- Destructive tests must run only against disposable resources.
- Any test failure must preserve diagnostic evidence without exposing secrets or personal payloads.

## 6. CI quality gates

Proposed pipeline:
1. install exact dependencies from lockfile;
2. typecheck;
3. lint/static analysis;
4. unit tests;
5. architecture boundary tests;
6. component tests;
7. isolated database/RLS integration tests;
8. production build;
9. browser E2E on Chromium and WebKit (Firefox according to release risk);
10. accessibility smoke checks;
11. artifact and secret scan;
12. deploy staging;
13. staging smoke tests;
14. manual iOS Safari acceptance for critical release;
15. owner approval before production deployment.

Production deploy must not happen automatically until explicitly approved. A green CI pipeline does not authorize deployment.

## 7. Coverage and pass criteria

Do not use one global line-coverage percentage as the sole quality metric. Require:
- all critical business rules have unit tests;
- all access boundaries have positive and negative authorization tests;
- every critical use case has success, validation, failure and idempotency coverage;
- every protected route has anonymous and unauthorized-user tests;
- all Auth journeys have end-to-end coverage;
- migration changes have clean-install and upgrade tests;
- high-risk UI flows have browser E2E coverage;
- critical mobile/accessibility issues block release.

Coverage thresholds can be introduced after baseline; they must not incentivize meaningless tests.

## 8. Test failure handling

A failed test is not silently skipped or reclassified as flaky. Flaky tests must be tracked with owner, evidence and repair deadline. Retries in CI may help diagnose instability but must not convert repeated nondeterministic failures into a passing release. Quarantined tests cannot cover critical security or data integrity requirements.

Test reports include commit SHA, environment, browser/runtime, test data identity, failure trace and artifact links with secrets redacted.

## 9. Decision and unresolved points

**Статус:** PROPOSED.

**Recommendation:** Vitest + Vue Test Utils for unit/component/application tests; Playwright Test for browser E2E; isolated Supabase environment for database/RLS integration; real iOS Safari for final mobile verification.

Before acceptance:
1. Confirm ADR-002 frontend choice.
2. Verify exact compatibility between Vite 8, Vitest 5, Node runtime and Vue tooling.
3. Decide whether CI can access an isolated Supabase test project or a local Supabase stack.
4. Define test account provisioning and cleanup.
5. Define browser/iOS support matrix.
6. Select accessibility and architecture-boundary tooling.
7. Confirm where CI artifacts and reports are stored and their retention.

No test runner, CI workflow, Supabase test resource or deployment configuration is created by this ADR.

## 10. References

- Vue testing guide: https://vuejs.org/guide/scaling-up/testing.html
- Vue Test Utils guide: https://test-utils.vuejs.org/guide/
- Vitest guide: https://vitest.dev/guide/
- Vitest releases and supported versions: https://vitest.dev/releases.html
- Vitest 4.1 Vite 8 support announcement: https://vitest.dev/blog/vitest-4-1.html
- Playwright browser support: https://playwright.dev/docs/browsers
- Playwright device emulation: https://playwright.dev/docs/emulation


## 5. Текущий implementation baseline (05.11.2026)

ADR-002 принят с ограничениями: Vue 3, Vue Router 5 и Vite выбраны; TypeScript не утверждён. ADR-003 остаётся PROPOSED, Pinia в текущую реализацию не добавлена.

На migration branch реализован начальный проверяемый baseline:

- Unit tests используют встроенный Node.js `node:test`; отдельная test-runner dependency не требуется.
- Покрыты Domain rules для Ideas/Projects и Application services для Ideas, Projects, Authentication и Account Settings.
- Architecture tests проверяют направление зависимостей Domain/Application/Presentation и запрет CSS bindings через `:style`.
- Build-output smoke checks проверяют корневой SPA entry, legacy URL handoffs, Auth callback/recovery bridges, hash compatibility и route registry.
- Последний подтверждённый полный pipeline `42102398276` завершился успешно: 42 tests passed, production build и build-output smoke checks — SUCCESS.

Это начальный unit/architecture/build baseline, а не принятие всей стратегии из ADR. Vitest, Vue Test Utils, Playwright, isolated Supabase integration/RLS tests и real-device iOS Safari validation пока не внедрены. Стратегия остаётся PROPOSED до отдельного review владельца и выполнения оставшихся quality gates.
