<!-- version 1.1 -->

# Снимок текущего состояния Raymondovich.ru перед архитектурной переработкой

**Дата фиксации:** 05.11.2026  
**Репозиторий:** `raymondovich-cloud/raymondovich.ru`  
**Ветка:** `main`  
**Исходный commit (до добавления этого документа):** `95f62ca1199beb2400a0a8622fc3b4b4446f68ff`  
**Назначение:** зафиксировать фактическое состояние репозитория перед переходом с MPA на SPA с собственным маршрутизатором.

> Это документальный снимок Git-состояния и статический аудит исходников. Он не является подтверждением работоспособности production, актуального состояния внешнего Supabase-проекта или прохождения runtime-тестов.

## 1. Границы фиксации

В снимок входит только репозиторий `raymondovich.ru`. Репозиторий `raymondovich.online` не анализировался и не изменялся.

Зафиксированное состояние относится к исходному commit `95f62ca1199beb2400a0a8622fc3b4b4446f68ff`. Документ добавляется отдельным последующим commit, не меняющим прикладной код, HTML, CSS, JavaScript или миграции.

## 2. Общая характеристика приложения

### 2.1. Архитектурная модель

На уровне сайта используется **MPA (Multi-Page Application)**: самостоятельные HTML-документы являются точками входа страниц, а обычная навигация между ними выполняется через URL и загрузку документа браузером.

Отдельного общего SPA Router в репозитории не обнаружено. Внутренние ссылки и сценарии перенаправления используют пути к конкретным HTML-файлам, а в клиентском коде встречается `window.location` / `window.location.replace`.

При этом Control Center внутри `/pages/account/app.html` уже имеет внутреннюю навигацию между представлениями (Обзор, Идеи, Проекты) на одной HTML-странице. Это локальная навигация рабочего пространства, а не общий маршрутизатор всего сайта.

### 2.2. Технологии, подтверждённые исходниками

- HTML5.
- CSS: стили непосредственно в HTML отдельных страниц и общие файлы в `source/design/`.
- JavaScript ES modules (`type="module"` и `import/export`).
- Supabase Auth и Supabase Database через `@supabase/supabase-js@2.117.3`, импортируемый с jsDelivr.
- GitHub Pages включён в настройках репозитория; в корне присутствует `CNAME` со значением `raymondovich.ru`.
- В просмотренном дереве на исходном commit не обнаружены `package.json`, конфигурация сборщика и каталог `.github/workflows/`.

Последний пункт означает, что наличие npm build pipeline или GitHub Actions deployment workflow по текущему снимку не подтверждено. Это не доказывает отсутствие внешней конфигурации хостинга.

## 3. Инвентаризация HTML-точек входа

В дереве исходного commit обнаружено 16 HTML-файлов:

| № | Файл | Назначение по структуре/содержимому |
|---:|---|---|
| 1 | `index.html` | Публичная главная страница |
| 2 | `pages/about/about.html` | О странице / информация |
| 3 | `pages/products/products.html` | Страница продуктов |
| 4 | `pages/cooperation/cooperation.html` | Страница сотрудничества |
| 5 | `pages/profile/profile.html` | Профиль |
| 6 | `pages/settings/settings.html` | Настройки |
| 7 | `pages/account/app.html` | Закрытое рабочее пространство Control Center |
| 8 | `pages/auth/auth.html` | Вход |
| 9 | `pages/auth/register.html` | Регистрация |
| 10 | `pages/auth/reset-password.html` | Запрос сброса пароля |
| 11 | `pages/auth/update-password.html` | Установка нового пароля |
| 12 | `pages/auth/auth-callback.html` | Callback авторизации |
| 13 | `pages/legal/privacy.html` | Политика конфиденциальности |
| 14 | `pages/legal/terms.html` | Условия использования |
| 15 | `pages/legal/cookies.html` | Политика cookies |
| 16 | `pages/legal/private-conditions.html` | Условия закрытого пространства |

Этот список фиксирует HTML-файлы в Git, а не гарантирует, что каждый из них опубликован, доступен посетителям или корректно обрабатывается текущим хостингом.

## 4. Текущие URL и навигационные зависимости

### 4.1. Основные внутренние адреса

В HTML и JavaScript обнаружены ссылки/переходы на следующие адреса:

- `/`
- `/pages/about/about.html`
- `/pages/products/products.html`
- `/pages/cooperation/cooperation.html`
- `/pages/profile/profile.html`
- `/pages/settings/settings.html`
- `/pages/account/app.html`
- `/pages/auth/auth.html`
- `/pages/auth/register.html`
- `/pages/auth/reset-password.html`
- `/pages/auth/update-password.html`
- `/pages/auth/auth-callback.html`
- `/#private`

В нескольких страницах присутствуют общие ссылки боковой навигации. Страницы продуктов, сотрудничества и профиля подключают общие скрипты боковой навигации и выхода. Настройки дополнительно подключают `settings-page.js`.

### 4.2. Auth redirect URLs

В `source/application/auth/authentication.js` зафиксированы:

- Callback: `https://raymondovich.ru/pages/auth/auth-callback.html`
- Password recovery: `https://raymondovich.ru/pages/auth/update-password.html`

Эти адреса связаны с письмами Supabase Auth и являются критичными для миграции маршрутов. Их нельзя менять без проверки Redirect URL allowlist, шаблонов писем и реальных сценариев подтверждения/восстановления.

### 4.3. Последствия перехода на SPA

При переходе на чистые URL потребуется отдельно обеспечить:

- прямое открытие любого маршрута из адресной строки;
- корректную перезагрузку вложенного URL;
- корректную работу Back/Forward через History API;
- fallback/rewrite на стороне фактического хостинга;
- обработку старых `.html`-адресов и совместимость внешних ссылок;
- сохранение callback и recovery flow;
- отдельные title, description, canonical и robots для публичных страниц;
- корректную обработку 404 и неизвестного маршрута.

GitHub Pages не следует считать автоматически настроенным для SPA fallback. Наличие `CNAME` само по себе не подтверждает способ маршрутизации домена или наличие Cloudflare Worker/Pages Functions. Эти детали требуют отдельной проверки.

## 5. JavaScript: фактическая структура

В репозитории присутствуют следующие основные слои:

### `source/application/`

- `account/account-session.js`
- `account/account-settings.js`
- `auth/authentication.js`
- `ideas/idea-service.js`
- `projects/project-service.js`

### `source/infrastructure/`

- `supabase/client.js`

Клиент Supabase создаётся в `source/infrastructure/supabase/client.js`. Используется URL проекта `yajybgdorhxebbigwjgi.supabase.co` и publishable key. В коде обнаружен импорт Supabase JS SDK версии `2.117.3` с CDN jsDelivr.

### `source/presentation/`

- `account/settings-page.js`
- `account/sidebar-logout.js`
- `account/sidebar-navigation.js`
- `app/app-page.js`
- `auth/auth-page.js`
- `auth/callback-page.js`
- `auth/register-page.js`
- `auth/reset-password-page.js`
- `auth/update-password-page.js`

`source/presentation/app/app-page.js` — крупный модуль (около 38,6 KB в исходном снимке), который управляет основным интерфейсом Control Center, состоянием представлений и взаимодействием с сервисами идей и проектов. Это важный кандидат для декомпозиции при rewrite, но его поведение сначала необходимо инвентаризировать и перенести без потери функций.

### Примечание о страницах

Часть публичных и кабинетных HTML содержит встроенные CSS и/или inline JavaScript. Поэтому карта файлов модулей не равна полной карте исполняемого кода. Перед переносом следует построить точную карту импортов, script blocks, DOM-контрактов и используемых селекторов.

## 6. Аутентификация и доступ

### 6.1. Подтверждённая логика исходников

`source/application/auth/authentication.js` предоставляет операции:

- получение сессии;
- регистрация;
- запрос восстановления пароля;
- обновление пароля;
- вход по email/password;
- выход;
- получение роли из `session.user.app_metadata.role`;
- создание/обновление профиля в `user_profiles`.

Auth presentation-модули разделены по страницам: вход, регистрация, callback, сброс и обновление пароля.

`source/presentation/app/app-page.js` импортирует методы сессии и роли, а также сервисы идей и проектов. `pages/account/app.html` содержит интерфейс Control Center и подключает этот модуль.

### 6.2. Важные ограничения

- Проверка сессии и роли в клиентском JavaScript не является самостоятельной границей безопасности.
- Фактическая защита данных должна обеспечиваться Supabase RLS, grants и серверными функциями там, где они нужны.
- Статический аудит репозитория не подтверждает актуальное состояние Auth settings, redirect allowlist, email templates, RLS в удалённой БД и фактические пользовательские сценарии.
- Все сценарии входа, регистрации, подтверждения email, восстановления пароля, выхода и истечения сессии необходимо проверить в runtime до/после миграции.

## 7. Данные и Supabase

### 7.1. Что видно в репозитории

В `supabase/migrations/` присутствуют миграции:

- `20261009132459_create_ecosystem_tools_registry.sql`
- `20261009132738_seed_ecosystem_tools_initial_inventory.sql`
- `20261009133334_restrict_ecosystem_tools_grants.sql`
- `20261009140217_reconcile_ecosystem_tool_inventory.sql`
- `20261009140350_link_lifegame_to_domain_provider.sql`
- `20261009143602_add_project_pinning.sql`
- `20261104120000_extend_projects_for_idea_inbox.sql`
- `20261104144433_split_ideas_and_projects.sql`
- `20261104185802_extend_ideas_with_optional_planning_details.sql`
- `20261104192000_extend_idea_planning_revenue_and_concept.sql`

Исходники application содержат сервисы для идей и проектов. В репозитории есть документация по модели инструментов и безопасности административного блока.

### 7.2. Существенное расхождение документации и миграций

Существующие `docs/architecture/overview.md` и `docs/architecture/projects.md` описывают идею и проект как одну запись с изменением статуса. В миграциях исходного commit присутствует `20261104144433_split_ideas_and_projects.sql`, то есть физическое разделение таблиц уже отражено в истории схемы.

В `docs/architecture/target-architecture.md` это расхождение уже отмечено как отдельный нерешённый вопрос. При архитектурной переработке нельзя слепо следовать устаревшему тексту или менять схему по предположению. Требуется сверить фактическую production-схему и действующие данные, затем принять отдельное доменное решение.

### 7.3. Что не подтверждено

Без прямой проверки подключённого Supabase-проекта этот снимок не утверждает:
- какие миграции реально применены в production;
- точное текущее состояние таблиц, constraints, indexes, grants и RLS policies;
- наличие/содержимое Edge Functions;
- объём и целостность пользовательских данных;
- актуальность резервных копий базы.

Архитектурный rewrite не должен автоматически выполнять миграции, удалять/переименовывать таблицы или менять политики доступа.

## 8. CSS и Design System

В репозитории обнаружены:

- `source/design/app.css`
- `source/design/auth.css`

Публичная главная страница содержит значительный inline CSS. Другие HTML также содержат локальные стили. В кабинете подключается `app.css`, в auth-страницах — `auth.css`.

Документальная архитектура выделяет `source/design/` как слой визуальной системы без бизнес-логики. Фактическую унификацию токенов, компонентов и стилей предстоит проверить отдельно: наличие папки Design не означает, что весь UI уже использует единую централизованную систему.

## 9. Документация, архитектурные решения и правила проекта

На исходном commit присутствуют:
- `docs/architecture/overview.md`
- `docs/architecture/projects.md`
- `docs/architecture/target-architecture.md`
- `docs/architecture/tools.md`
- `docs/architecture/tools-data-model.md`
- `docs/security/admin-security.md`
- `docs/public-site-content.md`
- журнал изменений в `docs/changes/`
- описание бизнес-аналитической идеи в `docs/ideas/business-analyst.md)

В целевой архитектуре уже зафиксированы принципы Clean Architecture, разделение ответственности, направление зависимостей, доменные границы, требования к Supabase/RLS и тестированию. Целевой документ содержит прежнее утверждение о сохранении MPA; оно больше не соответствует новому решению о переходе на SPA и должно быть обновлено отдельной редакцией после утверждения новой спецификации.

## 10. Текущий состав репозитория

По рекурсивному Git tree на исходном commit:

- 16 HTML-файлов.
- 10 SQL migration-файлов.
- 1 файл CNAME.
- Документы архитектуры, безопасности, публичного контента, идеи и журнал изменений.
- Исходный код в `source/application`, `source/core`, `source/design`, `source/domain`, `source/infrastructure`, `source/memory`, `source/presentation`.
- Отдельные README-файлы в ряде слоёв.

В корне и дереве, просмотренных на этом commit, не обнаружены:
- `package.json`;
- lock-файлы npm/pnpm/yarn;
- стандартная конфигурация сборщика;
- `.github/workflows/`;
- `404.html`;
- `.nojekyll`.

## 11. Известные технические риски и задачи перед rewrite

1. Нет общего SPA Router; текущая навигация привязана к HTML-файлам.
2. URL используются в HTML, JavaScript и Auth redirect configuration — миграция должна учитывать все источники ссылок.
3. Нужно подтвердить реальное поведение хостинга при прямом открытии вложенного URL и refresh.
4. Нужно исследовать фактическую конфигурацию DNS/CDN/Cloudflare, не делая предположений по одному CNAME.
5. Крупный `app-page.js` объединяет много presentation-обязанностей и требует безопасной декомпозиции.
6. Inline CSS/JS и локальные стили усложняют унификацию Design System.
7. Документация модели Ideas/Projects частично расходится с историей миграций.
8. Нет подтверждённой в репозитории автоматизированной сборки и тестового pipeline.
9. Статический аудит не равен функциональному, security или accessibility тестированию.
10. Нужно обеспечить совместимость старых ссылок, SEO-метаданных и публичных страниц при переходе на SPA.
11. Нужно отдельно проверить защиту закрытых данных на уровне Supabase; клиентские guards не должны рассматриваться как защита.
12. Необходимо определить стратегию rollback не только для frontend-кода, но и для любых потенциальных изменений БД/хостинга.

## 12. Что обязательно сохранить при архитектурной переработке

Переработка не должна сводиться к созданию нового Router. До удаления или замены существующего кода необходимо зафиксировать и перенести поведение:

- публичная главная и информационные страницы;
- продукты и сотрудничество;
- профиль и настройки;
- вход, регистрация, callback, восстановление и смена пароля;
- проверка сессии и роли;
- Control Center: обзор, идеи, проекты;
- создание, просмотр, редактирование, архивирование и другие существующие операции над идеями/проектами;
- боковая навигация, account panel и выход;
- сервисы Supabase и текущие контракты данных;
- визуальные состояния, адаптивность и доступность;
- все внутренние и внешние ссылки, используемые пользовательскими сценариями.

Точный перечень CRUD-возможностей и edge cases должен быть дополнен отдельной функциональной инвентаризацией до начала переноса.

## 13. Ограничения данного снимка

Этот документ:
- не является полным runtime-аудитом;
- не подтверждает доступность production-сайта;
- не подтверждает состояние внешней БД и Auth;
- не подтверждает работу всех страниц и сценариев;
- не является новой целевой архитектурой;
- не разрешает менять БД, Auth, DNS, Cloudflare или deployment;
- не заменяет последующее тестирование.

## 14. Базовая точка Git

Исходная редакция кода перед добавлением данного снимка:

```
Repository: raymondovich-cloud/raymondovich.ru
Branch: main
Commit: 95f62ca1199beb2400a0a8622fc3b4b4446f68ff
```

Именно этот commit должен оставаться доступным для сравнения и восстановления. Следующим отдельным шагом после документальной фиксации создаётся резервная точка восстановления (Git tag и backup branch) на согласованном commit. Ветка полной переработки создаётся только после завершения этого этапа.

---
**Итог:** на текущем состоянии Raymondovich.ru — статический MPA-сайт с отдельными ES module слоями и Supabase-backed Control Center. Переход на SPA потребует согласованной миграции маршрутизации, загрузки страниц, Auth redirects, hosting fallback и функциональности, а не только добавления файла router.js.


## 15. Функциональная инвентаризация: подтверждённые сценарии и контракты

**Дата дополнительной проверки:** 05.11.2026  
**Проверенная ветка:** `architecture/spa-rewrite-2026-11-05`  
**Проверенный commit до документального дополнения:** `df506fb002df63f2d6156b389a6b08c66eba190b`

Этот раздел дополняет статический снимок функциональной инвентаризацией JavaScript, DOM-контрактов и SQL-миграций. Проверка выполнялась чтением исходников и истории миграций; SQL не исполнялся, к production Supabase не подключались.

### 15.1. Полный перечень JavaScript-файлов

В дереве обнаружено 15 JS-файлов:

- Application: `account/account-session.js`, `account/account-settings.js`, `auth/authentication.js`, `ideas/idea-service.js`, `projects/project-service.js`.
- Infrastructure: `supabase/client.js`.
- Presentation: `account/settings-page.js`, `account/sidebar-logout.js`, `account/sidebar-navigation.js`, `app/app-page.js`, `auth/auth-page.js`, `auth/callback-page.js`, `auth/register-page.js`, `auth/reset-password-page.js`, `auth/update-password-page.js`.

Других JS-файлов в Git tree проверенной ветки не обнаружено. При этом часть поведения реализована inline-скриптами непосредственно в HTML.

### 15.2. Auth и аккаунт: фактические операции

Application-контракт `authentication.js`:

- `getSession()` — получить текущую сессию;
- `register()` — регистрация через email/password, запись display_name в user metadata и callback URL;
- `requestPasswordReset()` — запрос письма восстановления;
- `updatePassword()` — смена пароля;
- `login()` — вход по email/password;
- `logout()` — выход;
- `getRole()` — чтение роли из `user.app_metadata.role`;
- `ensureProfile()` — upsert в `user_profiles` при регистрации с уже выданной сессией или при входе.

Account settings:

- получение email, first_name, last_name и timezone из Supabase Auth user metadata;
- обновление first_name, last_name и timezone через `auth.updateUser({ data })`;
- изменение email через `auth.updateUser({ email })`;
- изменение пароля через `auth.updateUser({ password })`.

Подтверждены два нарушения целевой границы Presentation/Application:

- `source/presentation/auth/callback-page.js` напрямую вызывает `supabase.auth.exchangeCodeForSession()`;
- `source/presentation/auth/update-password-page.js` напрямую вызывает `getSession()`, подписывается на `onAuthStateChange()` и вызывает `signOut()`.

При этом `updatePassword()` уже проходит через Application. При переносе callback/recovery lifecycle следует оформить единым прикладным контрактом, не оставляя прямые обращения к Supabase в UI.

Отдельный вопрос согласования данных профиля: `ensureProfile()` записывает `display_name` в `user_profiles`, а экран настроек хранит first/last name и timezone в Auth user metadata. Это два разных хранилища профиля; их назначение и источник истины необходимо определить до переноса. Production-данные не проверялись.

### 15.3. Control Center: подтверждённые пользовательские сценарии

`app-page.js` содержит три представления: обзор, идеи и проекты. Внутренняя навигация выполняется через локальное состояние `state.view`, без изменения URL.

**Идеи:**
- создание с названием, описанием, целью, ожидаемой выручкой, оценкой затрат, бизнес-моделью, концепцией и дополнительной информацией;
- просмотр подробностей;
- перевод между «Новая» и «На рассмотрении»;
- назначение/снятие приоритета;
- запуск идеи с созданием отдельного проекта;
- архивирование и восстановление;
- окончательное удаление.

Статусы, используемые UI: `new`, `review`, `launched`, `archived`. Приоритеты БД: `low`, `normal`, `high`, `critical`; интерфейс переключает обычный/высокий приоритет.

**Проекты:**
- список и просмотр проектов;
- пауза/возобновление;
- завершение;
- архивирование/восстановление;
- назначение/снятие закрепления;
- назначение/снятие приоритета;
- удаление.

Статусы проектов после миграции разделения: `active`, `paused`, `completed`, `archived`. UI использует все эти статусы.

**Взаимодействие:**
- обычное нажатие на карточку идеи открывает подробности;
- длительное удерживание около 550 мс открывает меню действий;
- контекстное меню открывает то же меню;
- реализована обработка pointer move/up/cancel/leave, click и keyboard Enter/Space;
- диалог создания идеи, меню действий и подтверждение удаления являются частью существующего сценария и должны попасть в тестовую матрицу.

`app-page.js` (около 38,6 KB) объединяет рендеринг, управление представлениями, обработчики, диалоги и координацию операций. При декомпозиции необходимо сохранить поведенческие контракты, а не делить файл механически по размеру.

### 15.4. Application services и операции с данными

`idea-service.js`:
- `listIdeas(ownerId)`;
- `createIdea(...)`;
- `updateIdea(id, ownerId, changes)`;
- `deleteIdea(id, ownerId)`.

Читает и изменяет `public.ideas`. Выборка включает все поля идеи, включая плановые параметры и timestamps.

`project-service.js`:
- `listProjects(ownerId)`;
- `createProjectFromIdea(idea, ownerId)`;
- `updateProject(id, ownerId, changes)`;
- `deleteProject(id, ownerId)`.

Читает и изменяет `public.projects`, а при запуске/удалении проекта также обновляет `public.ideas`.

Операции запуска и удаления проекта состоят из нескольких отдельных запросов без транзакционной границы:
- запуск сначала создаёт проект, затем меняет статус идеи; при ошибке обновления идеи пытается удалить созданный проект, но ошибка компенсирующего удаления не обрабатывается отдельно;
- удаление сначала удаляет проект, затем возвращает исходную идею в `review`; если второй запрос завершается ошибкой, проект уже удалён.

Это подтверждённый риск согласованности данных. В целевой архитектуре сценарии требуют атомарной серверной операции либо другого явно спроектированного механизма компенсации. Конкретный механизм определить в отдельном решении после проверки инфраструктуры; текущий код не менять на этапе инвентаризации.

### 15.5. SQL migrations: подтверждённая модель

В десяти миграциях проверены следующие изменения:

- Реестр инструментов: `ecosystem_tools`, `tool_resources`, `project_tool_relations`, `project_resource_relations`; индексы, внешние ключи, CHECK constraints, RLS policies и grants.
- Начальное заполнение реестра сервисов, ресурсов и отношений.
- Явные grants для четырёх таблиц реестра; доступ authenticated ограничен RLS.
- Уточнение связей проектов с Supabase, REG.RU, доменами и LifeGame.
- Закрепление проектов: `is_pinned`, `pin_order`, ограничение неотрицательного порядка и индекс.
- Расширение жизненного цикла проектов, затем отдельное разделение идей и проектов.
- Плановые поля для идей и проектов: `goal`, `estimated_cost`, `additional_info`, `expected_revenue`, `business_model`, `concept`.
- Для денежных числовых полей заданы ограничения неотрицательных значений.
- Для дат проекта задано условие: target_due_date не раньше target_start_date, если обе даты заполнены.
- Для `ideas` создана RLS policy, ограничивающая операции ролью admin и совпадающим owner_id; authenticated получает CRUD grants.

После миграции разделения:
- `ideas.status`: `new`, `review`, `launched`, `archived`;
- `projects.status`: `active`, `paused`, `completed`, `archived`;
- `projects.source_idea_id` ссылается на `ideas.id`, при удалении идеи связь обнуляется;
- для source_idea_id создан уникальный частичный индекс, предотвращающий создание нескольких проектов из одной идеи.

### 15.6. Подтверждённые расхождения и незакрытые вопросы

1. **Устаревшая документация Ideas/Projects.** `docs/architecture/overview.md` и `docs/architecture/projects.md` всё ещё описывают идею и проект как одну запись в `projects`. Это противоречит фактической модели двух таблиц в миграции `20261104144433_split_ideas_and_projects.sql`. Документы требуют последующего обновления, но не меняются в рамках этого дополнения.
2. **Базовая схема не версионирована в найденном каталоге миграций.** В десяти SQL-файлах нет первоначального CREATE TABLE для `projects` и `user_profiles`, хотя миграции и приложение от них зависят. Поэтому полная исходная схема, первоначальные grants/RLS и базовые ограничения не могут быть восстановлены только из этого каталога.
3. **Дополнительные таблицы из документации.** `docs/architecture/tools-data-model.md` упоминает `project_milestones`, `project_tasks` и `project_history`, но их DDL в проверенных десяти миграциях отсутствует. Их текущее наличие и применение не подтверждены данным статическим аудитом.
4. **Поле закрепления.** Миграция добавляет `pin_order`, однако текущий `PROJECT_FIELDS` и сервисные операции его не читают и не изменяют. Текущий UI использует `is_pinned`; необходимость полноценного ручного порядка следует оценить отдельно.
5. **Профиль в двух хранилищах.** `user_profiles.display_name` и Auth user metadata содержат разные части профиля. Требуется определить единый контракт и источник истины.
6. **Схема проектов зависит от более раннего состояния.** `createProjectFromIdea()` вставляет `completion_criteria`, но в десяти миграциях данного каталога нет определения этого столбца. Нельзя считать его наличие подтверждённым только по текущему набору миграций.
7. **Удаление исходной идеи.** FK `projects.source_idea_id` использует `ON DELETE SET NULL`; сервис удаления идеи не проверяет связанные проекты. При прямом вызове удаления запущенной идеи проект останется, но связь с исходной идеей будет потеряна. UI обычно направляет действие с запущенной идеи в меню связанного проекта, однако сервисный контракт сам по себе этого ограничения не обеспечивает.

### 15.7. Границы достоверности

- Проверены исходники и SQL-файлы в Git указанной ветки/commit.
- SQL не исполнялся.
- Production Supabase, Auth settings, RLS, grants, данные, Edge Functions и резервные копии не проверялись.
- Не выполнялись browser/runtime, accessibility, security или integration tests.
- Выводы о миграциях описывают историю файлов в репозитории, а не гарантируют, что все эти миграции применены в production.
- Никакие прикладные файлы, SQL, настройки хостинга или production-сервисы не изменялись.

## 16. Предварительная матрица функционального переноса

Матрица фиксирует подтверждённые текущие сценарии. Целевые модули и маршруты предварительные и должны быть окончательно закреплены после завершения инвентаризации и ADR.

| Текущий сценарий | Текущие файлы | Данные/зависимости | Предварительный целевой модуль/маршрут |
|---|---|---|---|
| Публичная главная, боковая навигация, табы | `index.html` | HTML/CSS/inline JS, внешние ссылки | Public / `/` |
| О странице | `pages/about/about.html` | статический контент | Public / `/about` |
| Каталог продуктов | `pages/products/products.html` | статический контент, навигация | Public / `/products` |
| Форматы сотрудничества | `pages/cooperation/cooperation.html` | статический контент, навигация | Public / `/cooperation` |
| Профиль участника | `pages/profile/profile.html` | текущий HTML; динамический data-service не обнаружен | Identity/Profile / `/profile` |
| Настройки профиля | `pages/settings/settings.html`, `settings-page.js`, `account-settings.js` | Supabase Auth user metadata | Identity/Account / `/settings` |
| Вход | `auth.html`, `auth-page.js`, `authentication.js` | Supabase Auth | Identity/Auth / `/auth/login` |
| Регистрация и подтверждение email | `register.html`, `register-page.js`, `authentication.js`, callback | Supabase Auth, email redirect | Identity/Auth / `/auth/register`, callback route |
| Запрос восстановления пароля | `reset-password.html`, `reset-password-page.js` | Supabase Auth email | Identity/Auth / `/auth/recovery` |
| Callback обмена кода | `auth-callback.html`, `callback-page.js` | Supabase Auth PKCE/session exchange | Identity/Auth / callback route |
| Установка нового пароля | `update-password.html`, `update-password-page.js` | Supabase Auth recovery session | Identity/Auth / `/auth/update-password` |
| Выход и боковая навигация | `sidebar-logout.js`, `sidebar-navigation.js`, `app-page.js` | Auth session, DOM state | Identity + App Shell |
| Control Center: обзор | `app.html`, `app-page.js` | ideas/projects queries | Owner Control Center / overview route |
| Создание и просмотр идей | `app-page.js`, `idea-service.js` | `ideas` | Ideas module / ideas route |
| Изменение статуса, приоритета, архивация и восстановление идеи | `app-page.js`, `idea-service.js` | `ideas.status`, `ideas.priority` | Ideas module / ideas route |
| Запуск идеи в проект | `app-page.js`, `project-service.js` | `ideas`, `projects`, `source_idea_id` | Ideas + Projects use case |
| Управление проектом | `app-page.js`, `project-service.js` | `projects` | Projects module / projects route |
| Публичные правовые страницы | `pages/legal/*.html` | статический контент | Public / соответствующие legal routes |

Покрытие тестами по этой матрице пока не установлено. Для каждой строки требуется определить позитивные, негативные, permission, loading, error, empty и recovery states, а затем связать их с тестами.
