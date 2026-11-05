# ADR-003: State management strategy

**Статус:** PROPOSED — рекомендация для рассмотрения владельцем; не утверждено.  
**Дата исследования:** 05.11.2026  
**Область:** только Raymondovich.ru  
**Зависимость:** условно предполагает Vue 3 из ADR-002; если frontend framework будет отклонён, библиотечный выбор пересматривается.

## 1. Контекст

Целевая архитектура уже определяет владение состоянием независимо от библиотеки:
- URL State принадлежит Router и URL;
- Module State принадлежит функциональному модулю;
- Application State существует только для действительно общих сценариев;
- Session State принадлежит Identity/Auth;
- Persistent State принадлежит backend/server;
- ephemeral UI state остаётся в компоненте или локальном модуле;
- cache не заменяет server source of truth.

Задача ADR — определить, нужна ли общая библиотека, где она применяется и как не превратить её в глобальное хранилище всех данных.

## 2. Требования

1. Изоляция состояния четырёх пространств и проектных контекстов.
2. Один владелец для каждого state domain.
3. Явные contracts для чтения/изменения общего состояния.
4. Отсутствие прямого доступа модулей к внутренним store другого модуля.
5. Очистка session/user scoped state при logout/account switch.
6. TypeScript support.
7. Testability and dev diagnostics.
8. Минимальный runtime/maintenance overhead.
9. Server data не копируется в глобальный store без причины.
10. SSR-safe design, если в будущем будет выбран prerender/SSR.

## 3. Рассмотренные варианты

### A. Без глобальной state library

Использовать component-local reactive state и module-scoped composables; Application Layer передаёт зависимости через contracts.

Плюсы:
- минимум зависимостей;
- естественное соблюдение локального владения;
- меньше риска глобального состояния;
- достаточно для небольшой SPA.

Минусы:
- cross-component/shared state patterns могут стать неоднородными;
- session, global shell and cross-route state потребуют единых соглашений;
- отсутствие devtools/centralized inspection для действительно общего состояния.

Вывод: допустимый стартовый вариант, но при четырёх пространствах и нескольких cross-cutting state domains может привести к собственным несогласованным abstractions.

### B. Pinia (условно при Vue)

Плюсы:
- официальный рекомендуемый state library для Vue ecosystem;
- модульные stores, TypeScript inference, devtools and testing utilities;
- допускает несколько отдельных stores вместо одного универсального;
- подходит для общего application/session state, когда такой state действительно нужен;
- может быть введена постепенно.

Минусы:
- дополнительная зависимость и runtime;
- риск превратить stores в глобальные repositories или дублирующее server data cache;
- Pinia 4 — major release с ESM-only изменением и изменением devtools dependency; нужно фиксировать совместимые версии и проверить окружение;
- не решает сама по себе permissions, persistence, data fetching or cache consistency.

Вывод: наиболее подходящий кандидат, если Vue 3 будет утверждён, при строгих правилах ограниченного применения.

### C. Redux Toolkit

Плюсы:
- строгая и предсказуемая модель обновлений;
- развитые devtools, middleware, normalized state and testing patterns;
- может использоваться не только с React.

Минусы:
- больше ceremony и концептуального веса, чем требуется для текущего числа общих состояний;
- не является естественным default для Vue-платформы;
- создаёт риск централизовать состояния, которые должны принадлежать отдельным модулям.

Вывод: не рекомендован для данного Vue-oriented проекта; рассматривать только если в будущем появятся сложные глобальные workflows, требующие event/action-oriented централизованной модели.

### D. Собственная глобальная store abstraction

Плюсы:
- полная настройка под нужды платформы.

Минусы:
- необходимость самостоятельно проектировать subscriptions, devtools, cleanup, testing, persistence and SSR behaviour;
- высокий риск получить собственную библиотеку с долгосрочной стоимостью поддержки;
- нет доказанной потребности.

Вывод: не создавать.

## 4. Рекомендуемое решение

**Рекомендованный кандидат: Pinia 4.x — только для общего application/session state и межкомпонентного состояния с подтверждённой общей ответственностью, при условии утверждения Vue 3.**

Это не означает, что все данные приложения должны храниться в Pinia.

### 4.1. Что может находиться в Pinia

Только состояния, у которых есть обоснованный общий владелец:
- Identity/Auth session projection and auth status (не токены как произвольный persisted state);
- текущий account context and available spaces;
- selected active workspace/project context, если он нужен нескольким маршрутам;
- shell-level UI preferences and global notifications;
- небольшие cross-route workflows, если их lifecycle действительно шире одного модуля.

Каждый store принадлежит конкретной ответственности и имеет публичный контракт.

### 4.2. Что не должно автоматически попадать в Pinia

- все идеи, проекты и записи БД как полная копия backend;
- локальное состояние диалога, формы, hover, focus and transient UI;
- URL query/filter/pagination state;
- секреты, service-role credentials or auth tokens persisted in localStorage;
- внутреннее состояние другого модуля;
- произвольные API responses без domain mapping;
- cache, который дублирует отдельную query/cache policy.

### 4.3. Module State

Module State остаётся внутри функционального модуля. Внутри допускаются composables/reactive state или локальный store, но наружу выставляются только публичные методы/события/контракты. Не создавать отдельный Pinia store на каждую страницу автоматически.

### 4.4. Persistent and server state

Supabase/server остаётся source of truth. Pinia не заменяет repositories, Application use cases или RLS. После мутации модуль обновляет свой view state либо инвалидирует cache по согласованной политике. На logout/account switch очищаются все user/project scoped stores and caches.

### 4.5. URL State

Router owns URL State. Если фильтр, вкладка, сортировка или пагинация должны восстанавливаться по ссылке и Back/Forward, они хранятся в URL. Не создавать независимую копию URL state в Pinia.

## 5. Lifecycle, isolation and security

- Stores и их subscriptions имеют явный lifecycle.
- Module stores не импортируются напрямую другими модулями.
- При смене пользователя очищаются user-specific state and cache до отображения данных новой сессии.
- При смене project context проверяется доступ, после чего предыдущий project scoped state очищается/перезагружается.
- При logout удаляются временные данные, подписки и user-specific cache.
- Persist plugin не подключается глобально по умолчанию.
- Любое browser persistence требует указания data category, purpose, retention and threat assessment.
- Ошибка store не должна нарушать независимые пространства без необходимости.
- State library никогда не является механизмом backend authorization.

## 6. Server-state/cache library

В этом ADR не утверждается отдельная query/cache library. Сначала определить реальные server data use cases, частоту обновлений, optimistic update requirements, invalidation graph and offline expectations. Если собственная реализация кэширования становится сложной или ненадёжной, провести отдельное сравнение TanStack Query for Vue и альтернатив. Не смешивать server-state cache с UI/application state store.

## 7. Testing requirements

Проверять:
- store contract and transitions;
- logout/account switch cleanup;
- isolation between user/project contexts;
- duplicate/stale requests;
- subscriptions cleanup;
- URL-state synchronization;
- no persistence of sensitive values;
- module boundary enforcement;
- SSR compatibility if later enabled.

## 8. Decision and unresolved points

**Статус:** PROPOSED.

**Рекомендация:** Pinia 4.x conditional on Vue 3 approval, restricted to genuinely shared client state. Keep URL state in Router, module state inside modules, ephemeral UI state local, and persistent business data on server.

Before acceptance:
1. Confirm ADR-002 framework choice.
2. Verify compatible versions of Vue 3 and Pinia 4 at implementation start.
3. Define exact owner for Identity/session and active workspace context.
4. Decide whether a separate server-state/query cache is justified after mapping actual data scenarios.
5. Define logout/account switch cleanup tests.

No package installation, state migration or application code changes are authorized by this ADR.

## 9. References

- Pinia official introduction: https://pinia.vuejs.org/introduction.html
- Pinia state concepts: https://pinia.vuejs.org/core-concepts/state.html
- Pinia package/version information: https://www.npmjs.com/package/pinia
- Pinia 4 release notes: https://github.com/vuejs/pinia/releases
- Redux Toolkit official recommendation: https://redux.js.org/introduction/getting-started
