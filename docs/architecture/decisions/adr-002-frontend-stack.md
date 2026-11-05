# ADR-002: Frontend framework, language and build tooling

**Статус:** ACCEPTED WITH SCOPE — Vue 3 и Vue Router 5 утверждены владельцем 05.11.2026; Vite выбран как build tool для Vue SPA. TypeScript отложен и не считается утверждённым.  
**Дата исследования:** 05.11.2026  
**Область:** только Raymondovich.ru  
**Зависимости:** целевая архитектура SPA/Modular Monolith; ADR-001 частично решён: временный GitHub Pages + Hash Router утверждён, production hosting остаётся открытым.

## 1. Контекст и задача решения

Raymondovich.ru переходит от MPA с 16 HTML entry points к одному SPA entry point и четырём пользовательским пространствам. Приложение должно поддерживать модульные границы, публичные API модулей, Clean Architecture, DDD, lazy loading, мобильный Safari/iPhone, Supabase SDK, единый Design System и тестируемые маршруты.

В текущем Git baseline обнаружены JavaScript ES modules и Supabase JS SDK, но не обнаружены package.json, lockfile, build config, test runner или CI workflow. Это позволяет выбрать toolchain без необходимости сохранять существующую сборочную совместимость.

Выбор не должен превращать framework в архитектуру. Domain и Application остаются независимыми от UI framework; Vue/React/Svelte используются только в Presentation и app composition.

## 2. Критерии оценки

| Критерий | Вес/значимость |
|---|---|
| Соответствие SPA и четырём пространствам | Обязательное |
| Поддержка Modular Monolith и изоляции модулей | Обязательное |
| TypeScript и явные публичные контракты | Высокая |
| Маршрутизация, direct URL, history, lazy routes | Обязательное |
| Интеграция с Vite/static hosting | Высокая |
| Производительность мобильного Safari | Высокая |
| Тестируемость и accessibility tooling | Высокая |
| Зрелость экосистемы и документации | Высокая |
| Сложность сопровождения и количество зависимостей | Высокая |
| Возможность не использовать framework в Domain/Application | Обязательное |
| SEO/prerender compatibility for Public routes | Высокая, отдельное решение |
| Отсутствие CSS-in-JS как обязательной модели | Обязательное |

## 3. Сравнение подходов

### 3.1. Native ES Modules без framework и без bundler

**Плюсы**
- Минимум runtime dependencies.
- Использует текущую модель ES modules.
- Прямой контроль DOM и lifecycle.
- Низкий порог начального запуска.

**Минусы**
- При росте приложения усложняются компоненты, реактивность, lifecycle, forms, accessibility patterns и UI state.
- Browser native ESM не разрешает bare package imports без import maps или build tooling.
- Dependency management, tree-shaking, asset hashing, CSS splitting, chunk optimization и production bundling придётся решать отдельно.
- Поддержка крупных форм, dashboards, dialogs, tables и независимых layouts потребует собственной UI infrastructure.
- Риск создать внутренний самописный framework и router, который придётся поддерживать самостоятельно.

**Вывод:** оставить как baseline для простых изолированных scripts или отдельных технических модулей, но не рекомендовать как основу всей платформы.

### 3.2. Native ES Modules + Vite, без UI framework

**Плюсы**
- Сохраняется нативная модель ES modules.
- Vite обеспечивает dev server, dependency resolution/pre-bundling, HMR, production build и static output.
- Поддерживает dynamic imports и code splitting.
- Можно использовать TypeScript и обычные CSS files.
- Нет дополнительного UI framework runtime.

**Минусы**
- Компонентная модель, реактивность, lifecycle, rendering and state conventions придётся проектировать и поддерживать самостоятельно.
- Повышается риск разнородных UI-паттернов в четырёх пространствах.
- Тестирование и унификация сложного интерактивного интерфейса требуют собственной инфраструктуры.

**Вывод:** разумный компромисс для небольшой интерактивности, но недостаточно убедительный выбор для растущей платформы с несколькими workspace layouts и большим количеством управляемых сценариев.

### 3.3. React + Vite

**Плюсы**
- Зрелая экосистема и широкий выбор библиотек.
- Сильная компонентная модель и развитые практики тестирования.
- TypeScript широко используется.
- Хорошо подходит для больших интерактивных интерфейсов.
- Vite имеет официальный React integration.

**Минусы**
- Дополнительная сложность вокруг hooks, effects, state ownership and render lifecycle требует строгих соглашений.
- Высокая гибкость экосистемы повышает риск избыточного набора зависимостей.
- React Server Components не нужны базовому static SPA; официальная документация отдельно предупреждает, что API для реализации RSC bundlers/frameworks не следуют обычной semver stability.
- Для выбранной архитектуры нет уникальной возможности React, которая компенсировала бы дополнительную сложность по сравнению с Vue.

**Вывод:** технически полноценный вариант, но не первый кандидат для данной платформы.

### 3.4. Vue 3 + Vite

**Плюсы**
- Декларативная компонентная модель с HTML-подобными templates.
- Composition API позволяет выносить повторно используемую presentation logic без смешения с Domain/Application.
- Официальная поддержка TypeScript.
- Официальный Vue Router предоставляет nested/dynamic routes, query params, history/hash modes, navigation control and scroll behavior.
- Lazy route components через dynamic imports поддерживаются штатно.
- Vite имеет официальный Vue integration и static production output.
- Можно использовать обычные CSS files, CSS Modules или scoped component styles без CSS-in-JS.
- Vue core, Router и ecosystem имеют официальную документацию и активные релизы.

**Минусы**
- Нужны строгие правила, чтобы не размещать бизнес-логику в components/composables.
- Реактивность Vue требует понимания правил refs/reactive и корректного lifecycle cleanup.
- Vue Router 5 является относительно новым major release; следует избегать experimental API и фиксировать зависимости lockfile.
- Для SSR/prerender потребуется отдельная стратегия; сам факт выбора Vue не решает SEO.

**Вывод:** наиболее сбалансированный кандидат для текущего проекта: компонентная модель без необходимости вводить React-экосистему, официальный Router, TypeScript support и прямая интеграция с Vite.

### 3.5. Svelte 5 + Vite

**Плюсы**
- Compiler-first approach; значительная часть реактивной модели обрабатывается компилятором.
- Компактные компоненты и встроенные primitives.
- TypeScript support и Vite integration.
- Может давать эффективный runtime для UI.

**Минусы**
- Отличающаяся от стандартных JS framework conventions модель runes требует обучения и чётких соглашений.
- Экосистема интеграций и готовых решений меньше, чем у React; для данной платформы это повышает риск необходимости самостоятельно закрывать инфраструктурные задачи.
- SvelteKit является рекомендуемым полноценным application framework для ряда сценариев, но добавление server framework/SSR stack может усложнить выбранную static SPA архитектуру.

**Вывод:** сильный вариант для компактного UI, но не имеет достаточного преимущества для этой платформы над Vue.

## 4. Build tooling: Vite против отсутствия bundler

Vite рекомендован как отдельный build tool независимо от выбора UI framework.

Основания:
- dev server и HMR на базе native ESM;
- dependency resolution and pre-bundling;
- production build с оптимизированными static assets;
- dynamic imports and route-level code splitting;
- CSS code splitting and asset handling;
- официальные integrations для Vue, React и Svelte;
- подходит для публикации static build output.

На дату исследования официальные Vite release docs указывают поддерживаемую ветку 8.3; Vite 8 использует Rolldown как bundler. Точную patch version фиксировать в package manifest/lockfile при реализации, не записывать плавающий latest.

Vite не является backend, router, state manager или security boundary. Его build output должен содержать только клиентские assets и безопасную публичную конфигурацию.

## 5. TypeScript

**Рекомендация:** использовать TypeScript для новых application/presentation/infrastructure contracts и постепенно типизировать переносимые модули.

Обоснование:
- платформа содержит несколько пространств, permissions, project scopes и межмодульные contracts;
- типы помогают фиксировать input/output use cases, DTO mapping, permissions context и error models;
- Vue 3 Composition API поддерживает TypeScript;
- можно переносить существующий JavaScript постепенно, не требуя одномоментного rewrite всех модулей.

Требования:
- включить strict mode после оценки совместимости существующего кода;
- не использовать any как способ обхода ошибок типов;
- external data считать untrusted и проверять runtime schema validation;
- TypeScript types не заменяют runtime validation, RLS или server authorization;
- Domain/Application types не должны зависеть от Vue component types.

## 6. Предлагаемый frontend baseline

**Утверждённая основа:**
- Vue 3;
- Vue Router 5.x, без experimental APIs;
- Vite 8.x как build tool для разработки и сборки Vue SPA;
- обычные CSS files / CSS Modules / scoped styles в рамках Design System; CSS-in-JS не является обязательным;
- framework-independent Domain and Application layers;
- route-level lazy loading;
- static build output для выбранного hosting.

**Отдельно не утверждено:**
- TypeScript — не включать в обязательный baseline до отдельного решения; первоначальную миграцию допускается вести на JavaScript ES modules;
- Pinia/state manager — решение остаётся в ADR-003;
- production hosting, production routing и SEO/prerender — остаются отдельными решениями.
- обычные CSS files / CSS Modules / scoped styles в рамках Design System; CSS-in-JS не является обязательным;
- framework-independent Domain and Application layers;
- route-level lazy loading;
- static build output для выбранного hosting.

Это рекомендация ADR, а не уже принятое решение. Не устанавливать пакеты и не создавать конфигурацию до отдельного утверждения владельца.

## 7. Router и route registry

Если будет утверждён Vue, предпочтительно использовать официальный Vue Router, а не писать собственный Router с нуля.

Route registry остаётся централизованным и определяет:
- stable route name;
- path pattern and params;
- workspace/layout;
- lazy page component;
- public/authenticated/owner/project-scoped access metadata;
- metadata and SEO policy;
- navigation/focus/scroll behaviour.

Route guards — UX layer. Server-side RLS/authorization остаётся единственной границей доступа к данным. Business use cases не размещаются в Router.

Vue Router HTML5 history mode соответствует clean pathname URLs, но требует server-side SPA fallback. Временный режим для GitHub Pages уже утверждён владельцем: Hash Router. Если Vue Router будет выбран в ADR-002, для текущего этапа следует использовать его hash history mode. Для будущего production hosting route mode пересматривается отдельно: при платформе со штатным SPA rewrite возможен history mode. Никакой production routing не меняется до staging verification и отдельного approval.

## 8. SEO и Public workspace

SPA shell сам по себе не гарантирует индексируемое содержимое всех публичных маршрутов. До выбора SSR/prerender нужно определить:
- какие Public routes должны индексироваться;
- какие маршруты являются private/noindex;
- metadata, canonical, sitemap, robots and structured data;
- нужно ли предварительное статическое rendering публичных страниц;
- как обеспечить HTTP status 404 для неизвестных URL;
- не раскрывает ли prerender приватные данные.

Предварительная рекомендация: не вводить полноценный SSR только ради закрытых workspace. Отдельно оценить prerender/static generation для публичных маршрутов и оставить закрытые пространства client-rendered. Окончательное SEO решение — отдельная проверка перед production.

## 9. Browser and mobile requirements

Поддерживаемые браузеры должны включать актуальные версии iOS Safari, desktop Safari, Chrome, Edge and Firefox. Минимальные версии фиксируются после тестирования реальных устройств и Vite target review.

Обязательны:
- touch and pointer behaviour;
- keyboard navigation and focus management;
- responsive layouts;
- safe-area insets on iOS;
- reduced motion;
- no dependency on hover-only interactions;
- recovery from failed lazy chunk loads;
- no blocking long tasks on initial route;
- tests for back/forward and deep links on iOS Safari.

Vite production browser target must be explicitly checked against the supported iOS Safari matrix. Do not assume that a framework default automatically guarantees compatibility with every target iPhone.

## 10. Decision and unresolved points

**Статус:** ACCEPTED WITH SCOPE.

**Решение владельца от 05.11.2026:** использовать Vue 3 и Vue Router 5 для Presentation и навигации SPA. Vite 8.x принят как build tool, необходимый для SFC compilation, dependency management и static production build. Domain/Application остаются независимыми от Vue.

**Ограничение решения:** TypeScript не утверждён. Не вводить TypeScript как обязательную технологию без отдельного согласования; JavaScript ES modules остаются допустимым языком реализации. State manager не утверждён и рассматривается отдельно в ADR-003.

Остаются обязательными перед/во время реализации:
1. Проверить совместимость выбранных patch versions Vue, Vue Router и Vite, а также поддерживаемую версию Node.js.
2. Зафиксировать версии зависимостей в package manifest и lockfile; не использовать плавающий latest.
3. Использовать стабильные API Vue Router 5, без experimental APIs.
4. Проверить целевые версии iOS Safari и остальные browser targets.
5. Сохранить утверждённый для временной тестовой среды GitHub Pages + Hash Router.
6. Не менять production hosting, DNS, Supabase/Auth, backend или deployment без отдельного разрешения.
7. SEO/prerender для Public routes решить отдельно до production.

Решение разрешает начать изолированную SPA-реализацию в рабочей ветке и тестовой среде. Оно не разрешает merge в main или production deployment.

## 11. References

- React versions and release status: https://react.dev/versions
- React 19.3 release: https://react.dev/blog/2026/09/09/react-19-3
- React Server Components stability note: https://react.dev/reference/rsc/server-components
- Vue 3 introduction and Composition API: https://vuejs.org/guide/introduction.html
- Vue TypeScript Composition API: https://vuejs.org/guide/typescript/composition-api
- Vue Router introduction: https://router.vuejs.org/introduction.html
- Vue Router history mode and server fallback: https://router.vuejs.org/guide/essentials/history-mode
- Vue Router lazy route loading: https://router.vuejs.org/guide/advanced/lazy-loading
- Vue Router 5 migration: https://router.vuejs.org/guide/migration/v4-to-v5
- Pinia official introduction (reference only; no state library decision in this ADR): https://pinia.vuejs.org/introduction.html
- Svelte releases: https://github.com/sveltejs/svelte/releases
- Vite getting started and browser support: https://vite.dev/guide/
- Vite features and dynamic imports: https://vite.dev/guide/features
- Vite production build: https://vite.dev/guide/build
- Vite releases and supported versions: https://vite.dev/releases
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8
