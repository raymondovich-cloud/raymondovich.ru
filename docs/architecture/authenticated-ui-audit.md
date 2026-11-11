# Аудит авторизованного интерфейса

> Дата: 2026-11-11  
> Ветка: `main`  
> Статус: статический аудит; не является утверждённым UI-стандартом

## 1. Назначение и ограничения

Документ фиксирует состояние авторизованного пространства по исходному коду и доступной архитектурной документации. Он разделяет подтверждённые факты, архитектурные риски и вопросы, требующие браузерной проверки.

Проверялись JavaScript-разметка, CSS в `source/design-system/`, токены, темы и документы архитектуры. Браузерный рендеринг, автоматические UI-тесты, iPhone Safari и Telegram Mini App не запускались. Поэтому наличие CSS-правила не считается доказательством фактического поведения на устройстве. Скриншоты владельца подтверждают только конкретные показанные состояния. Причина возможного перекрытия контента нижней навигацией не установлена.

Этот аудит не проверяет backend, Supabase, RLS, безопасность серверных разрешений или интеграции.

## 2. Карта авторизованного пространства

| Раздел | Экран / состояние | Текущая реализация | Статус проверки |
|---|---|---|---|
| Общая оболочка | Welcome | Экран общей авторизованной оболочки | Статически проверен |
| Проекты | Реестр | Поиск, фильтры, сводка, группы и карточки | Статически проверен; есть скриншот |
| Проекты | Обзор проекта и подэкраны | Отдельные проектные экраны и модули | Требуется дополнительный проход по состояниям |
| Идеи | Реестр | Общие workspace-паттерны и локальная разметка | Статически проверен |
| Идеи | Детали, создание, редактирование | Отдельные экранные состояния и формы | Требуется проход по каждому состоянию |
| Инструменты | Основной маршрут | Заглушка / незавершённый раздел | Статически проверен |
| Профиль | Главный экран | Toolbar, поиск, Identity, группы и строки | Статически проверен; есть скриншот |
| Профиль | Каталог инструментов | Категории и информационные строки | Статически проверен |
| Профиль | Настройки | Карточки и поля формы | Статически проверен |
| Профиль | Избранное, отчёты, управление модулями | Пустые или запланированные состояния | Статически проверен |
| Owner Control Center | Главный экран | Группы details/summary и строки | Статически проверен |
| Проектные модули | Services | Сводки, сервисы, ресурсы, формы и меню | Основной рендерер проверен; нужны интерактивные состояния |
| Проектные модули | Accounting | Отдельный модуль | Требуется проверка состояний |
| Проектные модули | Analytics | Отдельный модуль | Требуется проверка состояний |
| Проектные модули | Marketing | Отдельный модуль | Требуется проверка состояний |

Доступность экранов зависит от существующих маршрутов и ролей. Аудит не предлагает расширять доступ.

## 3. Матрица экранов и компонентов

Формат: экран → компонент → текущая реализация → проблема/риск → предлагаемое правило.

### 3.1 Общая оболочка

Источники: `authenticated-app-shell.js`, `navigation.js`, `app-shell.css`.

| Экран | Компонент | Текущая реализация | Проблема / риск | Предлагаемое правило |
|---|---|---|---|---|
| Все авторизованные | Shell container | `.authenticated-app-shell`, max-width 1100 px | Не документированы типы контейнеров и критерии выбора ширины | Ввести narrow / standard / wide container с назначением каждого |
| Все авторизованные | Content area | `.authenticated-app-content`, адаптивные padding и нижний резерв | Локальные экраны могут добавлять собственные внешние отступы | Shell задаёт внешний layout; экран — внутреннюю композицию |
| Все авторизованные | Bottom navigation | Fixed-панель, четыре колонки, ширина до 520 px | Резерв padding не гарантирует доступность последнего элемента во всех вложенных scroll-контейнерах | Зафиксировать единый scroll-контракт и проверять достижимость последнего элемента |
| Все авторизованные | Fullscreen form | `.has-fullscreen-form` скрывает нижнюю навигацию и меняет padding | Важно симметрично включать и снимать состояние при выходе | Описать lifecycle полноэкранного режима |
| Все авторизованные | Back navigation | Общая кнопка возврата в общей оболочке | Локальные заголовки не должны создавать конкурирующую навигацию | Один источник Back; локальная кнопка допускается только при отдельном сценарии |
| Все авторизованные | Safe area | `--safe-bottom`, `--safe-left`, `--safe-right` | Статический CSS не доказывает корректность Safari и Telegram viewport | Все fixed/sticky элементы используют общие safe-area токены |

Подтверждённые значения: shell max-width 1100 px; нижний резерв content — `112px + var(--safe-bottom)`; bottom nav fixed и имеет мобильные правила. Причина визуального перекрытия не установлена.

### 3.2 Профиль

Источники: `profile.js`, `profile.css`.

| Экран | Компонент | Текущая реализация | Проблема / риск | Предлагаемое правило |
|---|---|---|---|---|
| Профиль | Container | `.profile-screen`, `.profile-subscreen`, max-width 700 px | Локальная ширина не связана с общей классификацией | Использовать тип контейнера общего layout-слоя |
| Профиль | Toolbar | `.profile-toolbar`, собственная grid-сетка и h1 | Отличается от workspace-заголовков | Общий Screen Header с вариантами title-only / title-actions |
| Профиль | Search | `.profile-search` и локальные input-правила | Геометрия отличается от `.ws-search` | Общий Search Field с контекстными размерами |
| Профиль | Identity | `.profile-identity`, avatar, имя, email, роль | Уникальный компонент, но его уровни не описаны общим стандартом | Специализированный Identity Block |
| Профиль | Group | `.profile-group` | Локальная поверхность и разделители | Общий Group Container contract |
| Профиль | Navigation Row | `.profile-row` | Собственная сетка, иконка, value и chevron | Стандартизировать Navigation Row, сохранив профильный вариант |
| Профиль | Tool Row | `.profile-tool-row` | Отличается от профильных и workspace-строк | Отдельный Information/Resource Row, не смешивать статичный контент и навигацию |
| Профиль | Form | `.profile-settings-card` и локальные поля | Повторное использование форм не формализовано | Общие Form Container, Field, Submit и Notice |
| Профиль | Empty State | `.profile-empty-panel`, `.profile-empty` | Несколько локальных вариантов пустого состояния | Общий Empty State с вариантами compact / full |

### 3.3 Проекты

Источники: `projects.js`, `projects.css`, `workspace-ui.css`, `shared/workspace-ui.js`.

| Экран | Компонент | Текущая реализация | Проблема / риск | Предлагаемое правило |
|---|---|---|---|---|
| Реестр | Registry layout | `.ws-page` и локальные контейнеры Projects | Общий и локальный CSS взаимодействуют через каскад | Общая анатомия реестра — workspace pattern; локальный CSS — только уникальные поля |
| Реестр | Toolbar | `.ws-toolbar`, `.ws-search`, `.ws-icon-button` | В workspace CSS есть scoped overrides для Projects/Ideas | Инвентаризировать overrides; удалять только после регрессионной проверки |
| Реестр | Filters | `.ws-filters` | Общая база и возможные локальные переопределения | Один контракт фильтров с централизованной адаптивностью |
| Реестр | Overview | `.ws-overview`, `.ws-stat`, `.ws-summary` | Варианты сводки не описаны как компонентный контракт | Общий Stats Pattern с документированными вариантами |
| Реестр | Cards | `.ws-card`, `.projects-registry-card` | Базовые и локальные правила пересекаются | Registry Card с явными модификаторами |
| Реестр | Groups | `.ws-group`, `.ws-group-content` | Для проектов и идей заданы разные сетки содержимого | Явные layout-модификаторы вместо неявных scoped переопределений |
| Подэкраны | Screen heading | `workspaceScreenHead()` / `.ws-screen-head` | Не все заголовки используют единый контракт | Один Screen Header contract |
| Проект | Overview / Module Cards | Локальные `.projects-*` классы | Специализированные компоненты не описаны общим стандартом | Сохранить Project Overview и Module Card, используя общие токены и состояния |
| Проект | Forms | Локальные project form classes | Эквивалентность форм других экранов не доказана | Общие поля, notices и кнопки; структуру формы оставить модулю |

### 3.4 Идеи

Источники: `ideas.js`, `ideas.css`, `workspace-ui.css`.

| Экран | Компонент | Текущая реализация | Проблема / риск | Предлагаемое правило |
|---|---|---|---|---|
| Реестр | Registry layout | `.ideas-registry` и workspace-классы | Смешение локальной и общей систем | Общая анатомия реестра с Projects |
| Реестр | Toolbar / Search / Actions | `.ws-toolbar`, `.ws-search`, `.ws-icon-button` | Есть повторные scoped правила для `.ideas-workspace` | Один источник размеров и состояний |
| Реестр | Filters / Overview | `.ws-*` и scoped overrides | Усложнённый каскад | Общие responsive-правила и явные модификаторы |
| Реестр | Idea Card | `.ws-card` и idea-specific classes | Контент уникален, оболочка должна быть общей | Registry Card с модификаторами статуса и приоритета |
| Детали | Detail screen | `.ideas-detail` и локальные элементы | Не описан общий Detail Pattern | Общий Detail Screen layout |
| Действия | Icon actions / Confirmation | `.ideas-icon-action`, `.ideas-convert-confirm` | Локальные действия и подтверждения | Общие Icon Button и Confirmation Panel |
| Создание / редактирование | Form | `.ideas-form` | Может расходиться с формами профиля и проектов | Общий набор полей, ошибок, notices и кнопок |

### 3.5 Owner Control Center

Источники: `owner-control-center.js`, `owner-control-center.css`.

| Экран | Компонент | Текущая реализация | Проблема / риск | Предлагаемое правило |
|---|---|---|---|---|
| Control Center | Container | `.owner-console-shell`, max-width 760 px | Локальная ширина не классифицирована | Использовать общий тип контейнера |
| Control Center | Groups | Нативные `details/summary`, `.owner-console-group` | Отдельная реализация раскрывающихся групп | Общий Accordion/Disclosure contract |
| Control Center | Rows | `.owner-console-row` и профильные классы | Административный экран зависит от CSS профиля | Разделить семантику компонентов, переиспользовать токены и primitives |
| Control Center | Planned state | Текстовые статусы «В разработке» | Нужен единый вид и доступное объяснение недоступности | Общий Planned/Disabled State; не изображать функцию действующей |
| Control Center | Documentation | `workspace-ui-standard.md` имеет статус «На утверждении» и описывает структуру, не совпадающую с текущей реализацией | Нельзя считать незавершённый документ утверждённым источником целевой структуры | Отдельно согласовать актуальную структуру Control Center перед UI-проектированием |

### 3.6 Проектные модули

Источники: `project-modules/services.js`, `accounting.js`, `analytics.js`, `marketing.js` и Design System.

| Экран | Компонент | Текущая реализация | Проблема / риск | Предлагаемое правило |
|---|---|---|---|---|
| Services | Service / Resource Row | `.projects-service-item` | Строка содержит название, назначение/тип и финансовые сведения; это не Navigation Row | Специализированный Resource Row с общими токенами |
| Services | Summary | `.projects-service-summary` | Локальная метрика | Общий Metric Card contract |
| Services | Forms | Локальные project form classes | Визуальная эквивалентность другим формам не подтверждена | Общие Form Field, Notice и Button |
| Services | Context menu | В коде обнаружено позиционирование через `menu.style.left` и `menu.style.top` | Прямое изменение визуальных свойств из JS противоречит разделу 6.2 AGENT.md | Перейти на семантические классы/атрибуты и правила Design System |
| Accounting | Module states | Отдельный модуль | Нужно различать empty, planned и loading/error | Общие Empty, Planned, Loading и Error states |
| Analytics | Module states | Отдельный модуль | Аналогичный риск смешения состояний | Общие Empty, Planned, Loading и Error states |
| Marketing | Module states | Отдельный модуль | Аналогичный риск смешения состояний | Общие Empty, Planned, Loading и Error states |

## 4. Сквозные выводы по Design System

### 4.1 Контейнеры

Подтверждённые локальные ширины: `.authenticated-app-shell` — до 1100 px; `.profile-screen` / `.profile-subscreen` — до 700 px; `.app-placeholder-screen` — до 760 px; `.owner-console-shell` — до 760 px. Разные ширины не являются дефектом сами по себе. Не хватает документированного правила выбора. Рекомендация: определить narrow, standard и wide containers и назначение каждого.

### 4.2 Workspace CSS cascade

В `workspace-ui.css` есть базовые определения `.ws-*` и отдельный блок scoped overrides для `.ideas-workspace` и `.projects-content`. Это подтверждает несколько уровней каскада для общих компонентов. Рекомендация: инвентаризировать каждый override, определить необходимость и постепенно заменить неявные guards явными модификаторами. Не удалять правила до регрессионной проверки.

### 4.3 Токены и темы

В `tokens.css` присутствуют базовые `--color-*`, семейства Owner и Ideas, градиенты и семейство `--ws-*`. `themes.css` содержит переопределения для светлой темы. Наличие отдельных семейств не является дефектом само по себе; риск заключается в отсутствии зафиксированной иерархии и ответственности токенов.

Рекомендуемая модель будущего стандарта: Foundation Tokens → Semantic Tokens → Component Tokens (только при необходимости) → Theme Mapping. Не объединять токены механически и не менять палитру в рамках аудита.

### 4.4 Семантические типы строк

Не следует сводить все строки к одному универсальному DOM-компоненту. Различать Navigation Row (переход), Information Row (статичная информация), Resource Row (сервис/ресурс с метаданными), Action Row (действие) и Form Field (ввод). Геометрия и токены могут быть общими, но семантика и взаимодействие — разными.

### 4.5 Состояния

В UI-стандарте отдельно описать default, hover (только для hover-устройств), active/pressed, focus-visible, disabled, loading, empty, error, planned/unavailable и expanded/collapsed. Эти состояния не взаимозаменяемы: «не реализовано» — не пустой список и не ошибка загрузки.

## 5. Приоритеты

| Приоритет | Задача | Обоснование |
|---|---|---|
| P0 | Сверить фактическую структуру Owner Control Center с незавершённым документом стандарта | Нельзя проектировать целевой экран на противоречивой документации |
| P1 | Разобрать scoped overrides в `workspace-ui.css` | Снизить риск регрессий и неявного каскада |
| P1 | Зафиксировать типы контейнеров и Screen Header | Общая геометрия затрагивает все экраны |
| P1 | Зафиксировать семантические типы строк и карточек | Устранить дублирование без чрезмерно универсального компонента |
| P1 | Устранить прямое позиционирование меню через `element.style` | Нарушение обязательного правила Design System |
| P2 | Определить иерархию токенов и правила тем | Упростить развитие тем и компонентов |
| P2 | Унифицировать Empty/Loading/Error/Planned states | Сделать состояния модулей последовательными |
| P2 | Унифицировать формы и feedback-компоненты | Снизить визуальные расхождения |
| P3 | Проверить адаптивность и safe areas в браузере | Нужен реальный рендеринг на целевых устройствах |

## 6. Предлагаемый порядок унификации

1. Согласовать целевую структуру Owner Control Center и статус `workspace-ui-standard.md`.
2. Спроектировать layout contract: контейнеры, Screen Header, scroll area, bottom navigation и safe areas.
3. Спроектировать primitives: Group Container, Divider, Icon Container, Button, Form Field.
4. Определить семантические компоненты: Navigation Row, Information Row, Resource Row, Registry Card, Metric Card, Module Card.
5. Определить Empty, Loading, Error, Planned, Disabled и Expanded states.
6. Применить стандарт к Profile.
7. Применить стандарт к Projects и Ideas.
8. Применить стандарт к Services и остальным проектным модулям.
9. Проверить Owner Control Center по отдельно согласованной целевой структуре.

Каждый шаг — вертикальный срез: Design System → экран → статические проверки → доступные ручные проверки. Не менять маршруты, права, данные и бизнес-логику в рамках визуальной миграции.

## 7. Критерии готовности будущего UI-стандарта

- У каждого авторизованного экрана указан тип контейнера.
- Определены контракты заголовка, возврата, scroll area и нижней навигации.
- Для повторяющихся элементов определены семантические компоненты.
- Для компонентов описаны размеры, spacing, типографика, поверхности, границы и состояния через токены.
- Описаны desktop/mobile правила и контрольные viewport.
- Зафиксированы правила тем и иерархия токенов.
- Определены Empty, Loading, Error, Planned и Disabled states.
- Зафиксированы ограничения CSS cascade и запрет визуальных DOM mutations.
- Существующие экраны сопоставлены с целевыми компонентами.
- Миграция не требует изменения бизнес-логики и прав доступа.

## 8. Источники в репозитории

- `docs/development.rules/agent.md` — обязательные правила, включая единый источник визуального оформления в Design System.
- `docs/architecture/workspace-ui-standard.md` — незавершённый стандарт, статус «На утверждении».
- `docs/architecture/authenticated-app-shell-profile.md`.
- `source/design-system/patterns/app-shell.css`.
- `source/design-system/patterns/profile.css`.
- `source/design-system/patterns/workspace-ui.css`.
- `source/design-system/patterns/owner-control-center.css`.
- `source/design-system/tokens/tokens.css`.
- `source/design-system/themes/themes.css`.
- `source/presentation/public/scripts/authenticated-app-shell.js`.
- `source/presentation/public/scripts/profile.js`.
- `source/presentation/public/scripts/projects.js`.
- `source/presentation/public/scripts/ideas.js`.
- `source/presentation/public/scripts/owner-control-center.js`.
- `source/presentation/public/scripts/project-modules/services.js`.
- `source/presentation/public/scripts/project-modules/accounting.js`.
- `source/presentation/public/scripts/project-modules/analytics.js`.
- `source/presentation/public/scripts/project-modules/marketing.js`.

## 9. Границы документа

Этот документ не утверждает новый визуальный дизайн, не изменяет CSS/JS приложения, маршруты, роли, права, бизнес-сценарии, БД, RLS, API, интеграции или секреты. Он не подтверждает браузерное отображение и не объявляет незавершённые модули готовыми. Его назначение — зафиксировать статический аудит и подготовить входные данные для проектирования единого UI-стандарта.


## 8. Контрольная точка: Profile и нижняя навигация как визуальный эталон

Дата фиксации: 2026-11-11. По решению владельца текущие Profile и нижняя навигация считаются завершёнными для данного этапа и используются как reference implementation. Их не следует массово переделывать в ходе унификации остальных экранов.

### 8.1. Что считается эталоном

- Нижняя навигация: компактная фиксированная Liquid Glass-поверхность, отдельные материалы для light/dark, понятное активное состояние, безопасные отступы.
- Profile identity: горизонтальная композиция — аватар слева, имя и email рядом, роль справа; компактная геометрия.
- Profile groups/rows: группировка содержимого, единые поверхности и разделители, ясная иерархия текста и статусов.
- Поведение при прокрутке: identity-блок постепенно сворачивается при движении вниз и возвращается при прокрутке вверх; реализация основана на CSS scroll-driven animation с fallback.
- Темы: light и dark должны оставаться равноправными; визуальные параметры проверяются отдельно.

Это эталон композиции и качества, а не требование превращать все данные в профильные строки или использовать стекло на каждой карточке.

### 8.2. Обновлённая карта экранов авторизованной части

| Область | Экран / состояние | Основные компоненты и паттерны | Приоритет унификации |
|---|---|---|---|
| App Shell | Welcome / главная авторизованной части | shell, welcome surface, screen header, summary/action blocks | P1 |
| Navigation | Нижняя панель, глобальный переход назад, меню | app-shell, navigation controller, safe areas | Эталон; сохранять |
| Projects | Реестр проектов | toolbar, search, filters, summary/statistics, groups, project cards, empty/loading/error | P1 |
| Projects | Обзор проекта | project header, status/metadata, project navigation, summary, actions | P1 |
| Projects | Внутренние разделы проекта | module header, section groups, data rows, forms, contextual actions | P1 |
| Services | Сервисы и ресурсы проекта | summary, service/resource rows, renewal/expense metadata, forms, menus | P1 |
| Ideas | Реестр идей | toolbar, search, filters, status groups, idea cards, empty/loading/error | P2 |
| Ideas | Просмотр / создание / редактирование | detail header, metadata, content blocks, fields, validation, actions | P2 |
| Owner Control Center | Главный экран владельца | grouped navigation, expandable groups, admin rows, status/value | P2 |
| Project Accounting | Учёт расходов и финансов | KPI/summary, transaction rows, category groups, forms, period filters | P3 |
| Project Marketing | Маркетинговые площадки | channel/account groups, metrics, revenue/status rows, forms | P3 |
| Project Analytics | Аналитика | metric summary, charts/indicators, periods, explanatory states | P3 |
| Profile | Основной экран | identity, groups, rows, profile-specific screens | Reference; не переделывать |
| Profile Tools | Каталог инструментов | category groups, resource rows, external links | P4 |
| Profile Settings | Настройки | settings groups, form fields, toggles, notices | P4 |
| Global Search | Поиск по разрешённым сущностям | search overlay, result groups, empty/loading/error | P2 |
| PIN Lock | Блокировка и подтверждение доступа | dedicated dark security surface | Исключение; не приводить к общим светлым карточкам |
| Authentication | Вход / восстановление / регистрация | auth forms, validation, notices | Отдельный публично-авторизационный паттерн |
| Public Site | Публичные страницы и формы заявок | public layout/home/intake | Вне текущей волны унификации авторизованных отделов |

Наличие строки в карте не означает, что экран полностью реализован или доступен каждой роли. Маршруты и фактические права остаются источником истины.

### 8.3. Ключевые разрывы между текущими паттернами

1. Разные системы заголовков: profile toolbar, workspace screen head и локальные заголовки модулей.
2. Разная геометрия поиска и действий: в общих workspace-стилях присутствуют крупные размеры toolbar/search/action на desktop, отдельные мобильные overrides и каскадные guards.
3. Сосуществуют профильные строки, workspace cards, owner rows и локальные module rows без единого формального контракта.
4. Группы, summary-блоки и карточки используют разные радиусы, плотность, разделители и уровни поверхностей.
5. Состояния loading/empty/error/success не имеют подтверждённого единого визуального покрытия для каждого отдела.
6. Поведение экранов при прокрутке, раскрытии групп и появлении нижней навигации требует проверки на реальных целевых контейнерах и устройствах.

### 8.4. Предлагаемая очередность

1. P1 — Welcome и Projects: общая точка входа и ключевой рабочий сценарий; унифицировать заголовок, контейнер, summary, поиск/фильтры, группы и карточки.
2. P1 — Project Overview и Services: сделать проектные экраны последовательными; сохранить различия между навигацией, информационной строкой и действием.
3. P2 — Ideas: применить проверенные компоненты реестра и детального экрана без копирования project-specific логики.
4. P2 — Owner Control Center: привести административную навигацию к общей геометрии Profile groups/rows, сохранив административную плотность и семантику.
5. P3 — Accounting, Marketing, Analytics: общий каркас, но специализированные представления данных; финансовые и аналитические данные не превращать в декоративные карточки.
6. P4 — Profile Tools и Settings: только точечная унификация подэкрана, не затрагивая утверждённый основной Profile.

### 8.5. Что не следует делать

- Не копировать профильную разметку и классы во все модули.
- Не превращать все рабочие данные в одинаковые карточки.
- Не применять Liquid Glass к таблицам, длинным спискам, формам и плотным данным без обоснования.
- Не менять маршруты, доступы, роли, запросы, бизнес-логику, Supabase/RLS и интеграции в рамках визуальной унификации.
- Не менять public-site позиционирование и публичные страницы в рамках этой волны.
- Не считать анимацию Profile обязательным поведением для каждого раздела: анимации должны решать конкретную задачу и учитывать reduced motion.

### 8.6. Критерии готовности отдельного экрана

- Визуальная иерархия согласуется с Profile и нижней навигацией.
- Используются общие tokens/components/patterns, а не локальные визуальные значения.
- Для light и dark определены и проверены поверхности, текст, границы, акцент и состояния.
- Сохранены роли, маршруты, семантика действий и существующие данные.
- Проверены узкий iPhone viewport, desktop и Telegram Mini App; проверена достижимость последнего элемента над нижней навигацией.
- Проверены loading, empty, error, disabled, focus-visible и reduced-motion состояния, если они применимы.
- Статические проверки и runtime-проверки явно разделены в отчёте.

## 9. Следующий технический шаг

До массовой реализации требуется согласовать обновлённый стандарт компонентов: Screen Header, Content Container, Group Container, Navigation Row, Information Row, Action Row, Summary/KPI, Search/Filter Toolbar, Form Field, Empty/Error/Loading State. После этого выполнять унификацию вертикальными срезами, начиная с Welcome и Projects.
