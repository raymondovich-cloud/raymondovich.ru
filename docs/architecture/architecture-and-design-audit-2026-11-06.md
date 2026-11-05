<!-- version 1.0 -->
# Аудит архитектурных связей и Design System

**Дата:** 06.11.2026  
**Статус:** AUDIT BASELINE — статический анализ файлов рабочей ветки  
**Ветка:** `rebuild/foundation-2026-11-06`  
**Базовый commit пересборки:** `613e572b13d2d01fd700ca81abfa399ec3daefbd`

> Аудит выполнен по исходникам и тестам GitHub. Локальный запуск сборки, unit tests, browser E2E и ручная проверка iPhone Safari в рамках этого аудита не выполнялись. Выводы о runtime-поведении не делаются.

## 1. Подтверждённые архитектурные связи

### 1.1. Composition root

`source/presentation/runtime/` фактически выполняет роль composition root:

- `runtime/services.js` создаёт Application services и передаёт им repositories;
- `runtime/auth.js` создаёт Authentication service и передаёт Auth/Profile gateways;
- Presentation views обращаются к runtime facade, а не импортируют Supabase repositories напрямую.

Фактическая цепочка для идей и проектов:

```text
Presentation SPA view
  -> Presentation runtime/services.js
      -> Application idea-service.js / project-service.js
          -> Domain idea.js / project.js
      -> Infrastructure idea-repository.js / project-repository.js
          -> Supabase client
```

Фактическая цепочка Auth:

```text
Presentation view / router guard
  -> Presentation runtime/auth.js
      -> Application authentication.js
          -> Infrastructure auth-gateway.js / profile-gateway.js
              -> Supabase client
```

Application services получают gateways/repositories через параметры конструктора. В просмотренных файлах Application не импортирует Supabase SDK, Infrastructure, Vue или DOM. Domain-файлы содержат чистые правила нормализации и проверки данных.

### 1.2. Автоматизированная защита границ

`tests/architecture/dependency-boundaries.test.js` уже проверяет:
- отсутствие зависимостей Domain от внешних слоёв и runtime framework;
- отсутствие зависимостей Application от Infrastructure, Supabase, Vue и browser globals;
- отсутствие прямого импорта Infrastructure internals из SPA views.

Это полезная существующая защита, которую следует сохранить и расширять. Текущий тест не проверяет весь граф межмодульных импортов, публичные API функциональных модулей или независимость Design System.

### 1.3. Router и пользовательские пространства

`source/presentation/spa/router/routes.js` содержит единый route registry и Hash Router. Маршруты разделены по metadata `space`: public, auth, owner, partner, external и system.

Подтверждено исходниками:
- Owner routes требуют сессию и проверяют роль `admin`;
- обычный пользователь перенаправляется на публичную главную;
- Partner и External routes пока проверяют только наличие сессии;
- отдельной проверки membership/project scope в route guard нет;
- Partner Workspace и External Project Workspace остаются placeholders согласно архитектурной документации.

Следствие: до реализации серверной проектной авторизации эти пространства нельзя считать готовыми рабочими кабинетами и нельзя подключать к ним защищённые данные. Проверка маршрута не заменяет RLS и backend authorization.

## 2. Найденные точки архитектурного внимания

### 2.1. Owner UI слишком концентрирован

`OwnerOverview.vue` одновременно:
- управляет навигацией между Overview, Ideas и Projects;
- хранит данные идей и проектов;
- содержит фильтры, account popover, sidebar state и dialog state;
- реализует действия и состояния взаимодействия;
- обрабатывает long-press/context-menu и другие UI-сценарии.

Файл содержит около 34 KB исходного текста. Это не доказывает ошибку Application/Domain, но показывает чрезмерную концентрацию Presentation-ответственности в одном компоненте. При пересборке нужно сохранить поведение и вынести самостоятельные UI-компоненты/interaction controllers по реальной ответственности. Не переносить этот файл целиком как готовую архитектуру интерфейса.

### 2.2. Повторение публичной навигации

В `PublicHome.vue`, `Products.vue` и `Cooperation.vue` обнаружена повторяющаяся структура боковой навигации. Это кандидат на единый Public layout/navigation component. Переносить её следует после определения публичного контракта компонента и проверки различий состояний/активного маршрута.

### 2.3. Существующая Design System пока не централизована

Папка `source/design/` существует и содержит отдельные CSS-файлы экранов. Однако текущее состояние не соответствует полностью самостоятельной токенизированной системе:

- `spa.css` задаёт глобальные базовые переменные `--spa-*` и базовые правила shell;
- `public.css`, `products.css` и `cooperation.css` повторяют близкие значения цветов, типографики и базовых размеров под разными именами;
- `owner.css` определяет собственный набор переменных `--bg`, `--panel`, `--accent`, `--border` и др.;
- базовые значения визуальной системы не имеют одного явно установленного источника истины;
- текущие файлы объединяют правила уровня foundations, layout, компонентов и локальной страницы.

Важное уточнение: страницы подключают свои таблицы через Vue `<style scoped src="...">`. Поэтому сами по себе общие имена селекторов в разных scoped styles не доказывают утечку CSS между страницами. Проблема подтверждена именно в дублировании и распределении визуальных токенов/ответственностей, а не в недоказанном runtime-конфликте.

Следующий шаг — инвентаризировать CSS и сгруппировать существующие правила по ответственности, затем создать единый источник tokens/foundations и переиспользуемые визуальные компоненты. На этом этапе не менять утверждённый визуальный характер бренда и не придумывать новую палитру.

## 3. Что сохраняем как существующие контракты

- Application services принимают repositories/gateways через dependency injection.
- Infrastructure repositories изолируют Supabase SDK.
- Runtime остаётся единственной точкой композиции конкретных адаптеров.
- Domain остаётся независимым и framework-agnostic.
- Router остаётся централизованным.
- Auth flow и существующие URL bridges не удаляются до отдельной проверки redirect contracts.
- Owner функциональные сценарии и touch/keyboard interactions сохраняются как baseline для parity tests.
- Различие priority и pinning сохраняется.
- Существующие статусы Ideas и Projects не переименовываются в рамках UI-пересборки.

## 4. План следующей реализации

1. Зафиксировать публичные API и ответственность существующих модулей, выявить оставшиеся нарушения по полному дереву импортов.
2. Завершить CSS inventory: tokens, foundations, layouts, visual primitives, page composition.
3. Сформировать структуру Design System на основе уже существующих значений и повторяющихся правил.
4. Добавить архитектурные тесты на границу Design и публичные API модулей.
5. После фиксации Design System пересобрать общие layouts и публичные страницы.
6. Затем отдельно пересобирать Owner UI с сохранением всех существующих сценариев и E2E-контрактов.

## 5. Ограничения аудита

- Проверялись файлы рабочей ветки, а не production runtime.
- Не проверялись реальные Supabase Auth email flows, RLS, grants или серверная проектная авторизация.
- Не выполнялись локальная сборка и тесты.
- Не проверялись реальные устройства и браузеры.
- Не изменялись исходные модули, production, main, backup branches или PR #3.
