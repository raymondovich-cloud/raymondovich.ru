<!-- version 1.3 -->

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


## 17. Публичные страницы, навигация, Auth routes и hosting

### 17.1. Полная проверка HTML-контрактов

Повторно просмотрены все 16 HTML-документов. Проверены DOM IDs, формы, элементы управления, ссылки, inline scripts и подключённые ES modules.

| Страница | DOM/интерактивные контракты | Вывод |
|---|---|---|
| `index.html` | `side`, `top`, `private`, `contact`; кнопки бокового и мобильного меню; inline scripts; logout и sidebar modules | Публичная главная с якорной навигацией, ссылками на продукты, сотрудничество, профиль, настройки, вход и внешние каналы |
| `pages/about/about.html` | Статический контент, ссылки на главную | Отдельная статическая страница без JS |
| `pages/products/products.html` | `side`, `ecosystem`, `partners`, `external`; меню; inline script; sidebar modules | Три статических направления; собственных форм/динамических запросов не обнаружено |
| `pages/cooperation/cooperation.html` | `side`, `own`, `partner`, `external`; меню; inline script; sidebar modules | Три формата развития проектов; статическая презентация |
| `pages/profile/profile.html` | `side`; меню; inline script; sidebar modules | Демонстрационный профиль, реальные данные не загружаются и редактирование отсутствует |
| `pages/settings/settings.html` | `profile-form`, `email-form`, `password-form`, сообщения статуса и timezone select | Три работающие по исходному коду формы: имя/фамилия/часовой пояс, смена email, смена пароля |
| `pages/account/app.html` | Навигация Control Center, account panel, idea dialog/form, динамические dialogs | Закрытая панель владельца; основные представления и часть диалогов создаются в JS |
| `pages/auth/auth.html` | `auth-form`, email/password, message | Вход |
| `pages/auth/register.html` | `registration-form`, display-name/email/password, message | Регистрация |
| `pages/auth/reset-password.html` | `reset-form`, email, message | Запрос письма восстановления |
| `pages/auth/update-password.html` | `update-password-form`, password/confirmation, message | Установка нового пароля в recovery session |
| `pages/auth/auth-callback.html` | `message` | Обмен authorization code на session |
| Четыре `pages/legal/*.html` | Статический текст; у private-conditions есть ссылка на главную | Статические правовые страницы |

Ни на одной из публичных страниц `about`, `products`, `cooperation`, `profile` не обнаружены формы отправки заявок, checkout или динамическое получение каталога. На главной присутствует цена RAYMONDOVICH Private (4 990 ₽, единоразовая оплата/бессрочный доступ), но в проверенном HTML не обнаружен checkout/payment flow: присутствуют ссылки на условия участия и внешние контакты. Это фиксирует только состояние исходников, а не фактический статус продаж.

### 17.2. Профиль, настройки и боковая навигация

- Профиль участника явно помечен как демонстрационная структура: имя, статус, дата регистрации и ID не загружаются из источника данных.
- Settings page вызывает Application services. При отсутствии сессии показывает ссылку на вход; при ошибке загрузки показывает сообщение. Отдельной route guard/redirect-механики в этой странице не обнаружено.
- Настройки читают/обновляют профиль через Auth metadata (см. раздел 15.6); формы блокируют submit на время операции и выводят inline-состояния успеха/ошибки.
- Общая боковая навигация использует обычные ссылки на HTML-документы и локально управляет раскрытием секций/aria-current; SPA Router отсутствует.
- В публичной навигации присутствуют ссылки на профиль и настройки независимо от текущей сессии. Доступ к settings фактически проверяется внутри страницы; профиль остаётся демонстрационным.
- На публичной главной и страницах каталога/сотрудничества/профиля/настроек присутствует logout button, обрабатываемый отдельным ES module.

### 17.3. Auth flow и выявленные проблемы переходов

Подтверждены следующие маршруты текущего MPA:
- Login: `/pages/auth/auth.html`.
- Registration: `/pages/auth/register.html`.
- Password reset request: `/pages/auth/reset-password.html`.
- Password recovery completion: `/pages/auth/update-password.html`.
- Email confirmation / code callback: `/pages/auth/auth-callback.html`.
- Private Control Center: `/pages/account/app.html`.

Application service использует callback URL `https://raymondovich.ru/pages/auth/auth-callback.html` и recovery URL `https://raymondovich.ru/pages/auth/update-password.html`.

**Подтверждённый риск role redirect loop для обычного пользователя:**
1. `getRole(session)` возвращает `session.user.app_metadata.role || "user"`.
2. Login page проверяет `if (!getRole(data.session))`; значение `"user"` truthy, поэтому проверка не ограничивает вход по роли.
3. После входа страница перенаправляет на `/pages/account/app.html`.
4. Control Center допускает только `getRole(session) === "admin"`; для роли user перенаправляет обратно на login page.
5. Login page при уже существующей сессии перенаправляет любого авторизованного пользователя обратно в Control Center.

Следовательно, для авторизованного пользователя без admin role исходный код формирует цикл перенаправлений между login и Control Center. Наличие такого пользователя в production и фактическое проявление цикла не проверялись. Исправление не выполнялось; это отдельный пункт функциональной миграции и тестирования.

Дополнительные наблюдения:
- Registration при включённом подтверждении email показывает сообщение о необходимости проверить почту; при полученной сессии перенаправляет в Control Center без отдельной проверки роли.
- Callback обменивает код на сессию и перенаправляет в Control Center.
- Recovery page подписывается на `PASSWORD_RECOVERY`, самостоятельно читает session, обновляет пароль, затем вызывает signOut. Это подтверждает ранее зафиксированное нарушение границы Presentation → Infrastructure.
- Login/register redirect logic не различает доступные пользователю пространства; текущая модель фактически построена вокруг одного admin-only Control Center.

### 17.4. GitHub Pages, DNS и Cloudflare: read-only проверка

Проверены дерево рабочей ветки и доступные read-only данные Cloudflare:
- В репозитории присутствует корневой `CNAME` с доменом `raymondovich.ru`.
- DNS zone `raymondovich.ru` в Cloudflare имеет статус active.
- Четыре A-записи корневого домена указывают на GitHub Pages IP: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- `www.raymondovich.ru` — CNAME на `raymondovich-cloud.github.io`.
- Все пять проверенных DNS-записей имеют `proxied: false` (DNS only). Следовательно, HTTP-трафик этих записей не проходит через Cloudflare proxy; Cloudflare zone-level proxy features/rules не являются подтверждённым механизмом маршрутизации текущего сайта.
- В Cloudflare Pages account project list не найдено проектов. Текущий DNS указывает на GitHub Pages, а не на Cloudflare Pages.
- Для Cloudflare zone не найден entrypoint ruleset в фазе `http_request_dynamic_redirect`. Это не заменяет полный аудит всех возможных redirect/transform mechanisms, но при DNS-only трафике эти Cloudflare edge rules не обрабатывают запросы к указанным DNS-записям.
- В проверенных DNS/zone settings `always_use_https` = off, `automatic_https_rewrites` = on, SSL = full. Поскольку DNS records не проксируются через Cloudflare, эти значения нельзя считать подтверждением фактической HTTPS-конфигурации GitHub Pages.
- В репозитории нет `404.html`, `_redirects`, `_routes.json`, `.nojekyll`, `.github/workflows/` или deployment/build config.
- GitHub Pages DNS и `CNAME` подтверждают целевую привязку к GitHub Pages, но не доказывают наличие SPA fallback или корректную обработку произвольных client-side routes.

**Архитектурное следствие:** перед переходом на чистые SPA routes требуется отдельное hosting/routing решение. Нужно подтвердить и протестировать прямое открытие, refresh, неизвестный маршрут, query/hash и fallback. Нельзя считать, что GitHub Pages автоматически отдаст `index.html` для будущего URL вроде `/auth/login`. Способ реализации fallback пока не выбран.

Ограничение проверки: GitHub Pages settings API не удалось прочитать через доступный GitHub connector; live HTTP/browser проверка домена через доступный инструмент также не состоялась. Поэтому фактические HTTP status/headers, certificate chain, redirects, cache headers и Pages build/deployment status не подтверждены.

### 17.5. Тестовая и build-инфраструктура

На проверенном commit дерево репозитория содержит 161 entry. Не обнаружены:
- каталоги/файлы тестов или спецификаций;
- Playwright, Cypress, Vitest, Jest или другая test runner configuration;
- `package.json`, package lock или иной manifest зависимостей;
- bundler/build config (Vite, Webpack, Rollup, Parcel и т. п.);
- `.github/workflows/` и GitHub Actions workflow files;
- конфигурации Vercel/Netlify/Cloudflare Pages;
- `404.html` и SPA fallback config.

Это означает, что тестовая и сборочная инфраструктура в проверенном дереве не зафиксирована. Это не доказывает отсутствие ручных проверок, внешнего CI или настроек вне репозитория.

### 17.6. Границы достоверности и следующий шаг

- HTML, JS и дерево файлов проверены статически в рабочей ветке `architecture/spa-rewrite-2026-11-05`.
- Cloudflare проверен только GET/read-only API запросами. Никакие DNS, zone settings, rulesets или Pages ресурсы не изменялись.
- Live browser/HTTP, accessibility, end-to-end, cross-browser и security tests не выполнены.
- Production Supabase/Auth/data/RLS/grants/Edge Functions не проверялись и не изменялись.
- `main`, backup branch и `raymondovich.online` не изменялись.
- Следующий этап: закрыть оставшуюся инвентаризацию и построить полную матрицу переноса с состояниями и тест-кейсами; затем оформить отдельные ADR по hosting fallback/routing, frontend stack/bundler, state management и testing. Реализация SPA по-прежнему не разрешена и не начиналась.


## 18. Полная функциональная матрица переноса и тестового покрытия

Матрица ниже фиксирует функции, реально обнаруженные в текущем коде, и отдельно — направления, которые подтверждены только архитектурными/продуктовыми документами. Целевые маршруты являются проектными идентификаторами для дальнейшего ADR, а не уже работающими URL. Все перечисленные тесты — обязательная будущая программа проверки; на данном этапе они не запускались.

### 18.1. Публичная часть

| Функция / сценарий | Текущая реализация | Целевой модуль / маршрут | Обязательные проверки |
|---|---|---|---|
| Главная и обзор экосистемы | `index.html`; якоря top/private/contact; публичные секции и FAQ | Public / `/` | Первичная загрузка; прямое открытие; якорные переходы; FAQ раскрытие/закрытие; отсутствие JS errors; мобильное меню; клавиатурная навигация; внешние ссылки; корректная работа без сессии |
| Публичная боковая навигация | HTML + inline JS + `sidebar-navigation.js` | App Shell navigation + Public routes | Правильный active route; раскрытие только одной группы; переход по ссылкам; закрытие меню; доступность с клавиатуры; мобильное состояние |
| О проекте / подход | `pages/about/about.html`, статическая страница | Public / `/about` | Прямое открытие/refresh; ссылки назад; адаптивность; отсутствие несуществующих ссылок |
| Каталог продуктов | `pages/products/products.html`, три направления | Public / `/products` | Отображение OWN/PARTNER/EXTERNAL; корректный контент и ссылки; пустое/неактивное состояние при отсутствии опубликованных карточек; мобильная адаптация |
| Форматы развития проектов | `pages/cooperation/cooperation.html`; утверждённый текст «Три формата развития проектов» | Public / `/cooperation` | Сохранение согласованного содержания; прямое открытие/refresh; корректность ссылок и адаптивность |
| Публичные контакты | Telegram, Instagram, YouTube ссылки на главной | Public / `/#contact` | Открытие правильного назначения; внешние ссылки не получают внутренний SPA routing; безопасные target/rel атрибуты |
| Условия участия | `pages/legal/private-conditions.html` | Public / `/legal/private-conditions` | Прямое открытие; полнота текста; обратная навигация; ссылки на контакты |
| Правовые документы | `privacy.html`, `terms.html`, `cookies.html` | Public / `/legal/privacy`, `/legal/terms`, `/legal/cookies` | Прямое открытие каждого маршрута; ссылки между документами/главной; корректность текста и мобильной верстки |

**Публичные ограничения текущей версии:** каталог и три формата — статические презентационные страницы, а не динамический каталог с данными проектов. Форма заявки, процесс модерации, checkout и оплата в текущих HTML/JS не обнаружены. Публичная цена Private не доказывает наличие работающей продажи.

### 18.2. Identity, Auth и Account

| Функция / сценарий | Текущая реализация | Целевой модуль / маршрут | Обязательные проверки |
|---|---|---|---|
| Вход | `auth-page.js` + `authentication.js` | Identity/Auth / `/auth/login` | Валидные/невалидные credentials; пустые поля; неверный пароль; rate limit; network error; повторный submit; loading; уже авторизованная admin-сессия; уже авторизованная non-admin-сессия |
| Регистрация | `register-page.js` + `authentication.js` | Identity/Auth / `/auth/register` | Обязательные поля; некорректный email; слабый пароль; повторный email; email confirmation включён/выключен; ошибка отправки; успешная регистрация без session; поведение при уже активной сессии |
| Запрос восстановления пароля | `reset-password-page.js` + `authentication.js` | Identity/Auth / `/auth/recovery` | Валидный/невалидный email; rate limit; нейтральное сообщение без раскрытия наличия аккаунта (если политика безопасности это предусматривает); network error; повторный запрос |
| Auth callback / email confirmation | `callback-page.js` | Identity/Auth / callback route | Валидный, отсутствующий, просроченный и повторно использованный code; exchange error; network failure; успешное создание session; безопасный конечный redirect |
| Установка нового пароля | `update-password-page.js` + `updatePassword()` | Identity/Auth / `/auth/update-password` | Валидная recovery session; отсутствующая/истёкшая session; PASSWORD_RECOVERY event; совпадение паролей; слабый пароль; успешное обновление; signOut; повторный вход |
| Logout | `sidebar-logout.js`, `account-session.js`, logout handler Control Center | Identity/Session + App Shell | Успешный logout; ошибка logout; очистка session-scoped state/cache; запрет возврата в закрытый экран через browser back; повторный logout |
| Профиль участника | `profile.html`, демонстрационные данные | Identity/Profile / `/profile` | До подключения данных не считать интерактивной функцией; после реализации — owner isolation, loading/empty/error, актуальные поля, отсутствие чужих данных |
| Настройки профиля | `settings-page.js`, `account-settings.js` | Identity/Account / `/settings` | Неавторизованный пользователь; загрузка metadata; сохранение имени/фамилии/timezone; неподдерживаемая timezone; ошибка сети; повторный submit; проверка сохранения после reload |
| Смена email | `updateAccountEmail()` | Identity/Account / `/settings` | Валидный/занятый email; rate limit; подтверждение нового адреса; старый email до подтверждения; ошибка отправки |
| Смена пароля из настроек | `updateAccountPassword()` | Identity/Account / `/settings` | Несовпадающие пароли; слабый пароль; успешное обновление; истёкшая session; отображение результата без утечки деталей |

**Критический Auth gate:** будущая матрица ролей обязана проверять anonymous, authenticated non-owner/non-admin, owner/admin, истёкшую сессию и смену account context. UI redirect не является защитой; доступ должен быть подтверждён серверными политиками. Текущая redirect loop для non-admin остаётся дефектом исходного поведения, который нельзя переносить как норму.

### 18.3. Owner Control Center

| Функция / сценарий | Текущая реализация | Целевой модуль / маршрут | Обязательные проверки |
|---|---|---|---|
| Вход в Control Center | `app.html`, `app-page.js`, admin-only guard | Owner Control Center / `/owner/overview` | Anonymous denied; non-admin denied; owner/admin allowed; expired session; Auth service unavailable; refresh на закрытом маршруте; back/forward |
| Обзор | Сводные счётчики, приоритетные и последние идеи/проекты | Owner Control Center / `/owner/overview` | Empty state; частично заполненные данные; корректные счётчики; сортировка; переход к идеям/проектам; ошибка загрузки; повторная загрузка |
| Создание идеи | Idea dialog + `createIdea()` | Ideas / `/owner/ideas` | Название обязательно; trim; пустые optional fields; денежные поля null/0/positive/negative/invalid; максимальные длины; двойной submit; network/RLS error; созданная запись видна после refresh |
| Просмотр и редактирование идеи | `openIdeaDetails()`, `updateIdea()` | Ideas / `/owner/ideas/:ideaId` (предварительно) | Загрузка существующей идеи; сохранение всех полей; пустые optional values; отрицательные суммы; несуществующий ID; ошибка сохранения; закрытие без сохранения; stale data |
| Идея: new/review | `updateIdea()`, action menu | Ideas / `/owner/ideas` | Перевод new → review и обратно; корректный статус после reload; повторный action; race/duplicate request |
| Идея: приоритет | UI переключает normal ↔ high; БД допускает low/normal/high/critical | Ideas / `/owner/ideas` | normal → high → normal; сохранение; отображение high/critical; проверить, что UI не затирает critical непреднамеренно |
| Идея: архив/восстановление | `archived` filter, restore → `new` | Ideas / `/owner/ideas/archive` | Архивация; отдельный архивный фильтр; восстановление; пустой архив; запрет случайного удаления; сохранение статуса |
| Запуск идеи в проект | `createProjectFromIdea()`; две таблицы и связь `source_idea_id` | Ideas + Projects use case / `/owner/ideas/:id/launch` | Проект создан один раз; поля перенесены без потери; идея стала launched; повторный запуск идемпотентен; unique conflict; отказ создания; отказ обновления идеи; отказ компенсационного удаления; восстановление согласованности |
| Просмотр запущенной идеи | Идея связывается с проектом; action menu открывает действия связанного проекта | Ideas + Projects / связанный project context | Связь существует; связь отсутствует; проект удалён; неверный owner; stale client cache; правильный переход к проекту |
| Список проектов | `listProjects()`, active/archive filters | Projects / `/owner/projects` | Пустой список; активные/paused/completed; архив; сортировка; корректный owner scope; query error |
| Пауза/возобновление | `updateProject()` | Projects / `/owner/projects/:projectId` | active → paused → active; reload; повторный action; ошибка сохранения |
| Завершение проекта | `status = completed` | Projects / `/owner/projects/:projectId` | Завершение; отображение в правильной выборке; исключение из active list согласно бизнес-правилу; обратное действие пока не обнаружено |
| Архивация/восстановление проекта | `archived`; restore → `active` | Projects / `/owner/projects/archive` | Архивация; фильтр; восстановление; пустой архив; ожидаемое поведение completed → archived → active |
| Закрепление проекта | `is_pinned` toggle | Projects / `/owner/projects` | Pin/unpin; reload; влияние на сортировку; согласование смысла `pin_order`, который сейчас не используется |
| Приоритет проекта | normal ↔ high UI action | Projects / `/owner/projects` | normal/high/critical; сохранение и сортировка; не потерять critical |
| Удаление идеи/проекта | confirm + delete service | Ideas/Projects / соответствующие detail routes | Отмена confirm; подтверждение; неверный ID; RLS denial; ошибка сервера; удаление связанного проекта и исходной идеи; FK behavior; восстановление/компенсация |
| Доступность и управление интерфейсом | Click, keyboard, contextmenu, long press около 550 ms, pointer cancel/move | App Shell + соответствующий модуль | Enter/Space; click; long press; context menu; touch cancel; движение пальца; случайное срабатывание при scroll; закрытие dialogs; focus trap/restore; iOS Safari |

**Ограничения текущей реализации Control Center:**
- В текущем HTML/JS обнаружены только Overview, Ideas и Projects.
- Создание проекта доступно через запуск идеи; отдельный сценарий создания проекта не обнаружен.
- Редактирование содержания идеи реализовано; самостоятельный экран/форма редактирования проекта не обнаружены.
- Для проектов UI предоставляет статусные действия, приоритет и pin; управление этапами, задачами и историей проекта не обнаружено.
- `project-service` и `idea-service` напрямую импортируют Supabase client. Application слой не изолирован от Infrastructure через port/adapter contract.
- Сценарии запуска и удаления проекта не атомарны; их тесты должны включать отказ каждого промежуточного шага.

### 18.4. Целевые пространства, не представленные в текущем исполняемом коде

| Целевая функция | Подтверждение в текущем репозитории | Целевое пространство / модуль | Статус инвентаризации |
|---|---|---|---|
| Owner: управление пользователями, партнёрами, внешними проектами, назначениями и разрешениями | Целевое требование архитектуры; действующего UI/сервисов в дереве не обнаружено | Owner Control Center / Identity, Access, Partners, External Projects | Требование зафиксировано; реализации не обнаружено |
| Owner: аналитика, документация, маркетинг, стратегия | Упоминается в `docs/ideas/business-analyst.md`; текущих маршрутов/модулей нет | Owner Control Center / соответствующие функциональные модули | Концептуальные разделы; не считать реализованными |
| Реестр инструментов и ресурсов | Есть SQL migrations для четырёх registry tables и документы `tools.md` / `tools-data-model.md`; текущей страницы `tools.html` и JS UI в дереве нет | Owner Control Center / Tools & Infrastructure | Схема и документация описаны; актуальный UI/production schema не подтверждены. Требуется отдельная проверка before deciding restore/rebuild |
| Этапы, задачи и история проектов | Документация упоминает `project_milestones`, `project_tasks`, `project_history`; соответствующего DDL в проверенных 10 migrations и UI в текущем дереве не обнаружено | Projects / Planning, Tasks, History | Наличие таблиц в production не подтверждено; кодового сценария не обнаружено |
| Partner Workspace | В целевой архитектуре утверждены категории Accounting, Services, Analytics, Marketing и custom modules; текущих страниц/сервисов не обнаружено | Partner Workspace | Целевая функция, не реализована в проверенном дереве |
| External Project Workspace | Утверждены referral links, promo codes, traffic/click statistics и promotion performance; текущих страниц/сервисов не обнаружено | External Project Workspace | Целевая функция, не реализована в проверенном дереве |
| Подача/модерация заявок на партнёрство и сторонний проект | Публично описана как процесс обсуждения и согласования; формы и workflow не обнаружены | Public + Owner Control Center / Applications & Admission | Текстовая концепция; исполняемого workflow нет |
| Платёжный процесс Private | На главной указана цена 4 990 ₽; payment provider, checkout, webhook и entitlement flow в проверенном дереве не обнаружены | Public + Billing/Entitlements | Продажа не реализована в проверенном исходном коде |
| AI Business Analyst | Документ `docs/ideas/business-analyst.md`, статус отложено; кода и API integration не обнаружено | Owner Control Center / Analytics Assistant | Отложено; не включать в текущий перенос как готовую функцию |
| Уведомления, мониторинг, аудит, backup/restore | Зафиксированы в архитектурной спецификации; текущих runtime модулей и таблиц в проверенном дереве не обнаружено | Core Platform Services / Owner Control Center | Архитектурные требования; реализация не подтверждена |

### 18.5. Документационные расхождения и реестр решений

1. `docs/architecture/overview.md` и `docs/architecture/projects.md` описывают прежнюю модель «идея = проект в одной записи». Это противоречит фактическим текущим сервисам и migration `20261104144433_split_ideas_and_projects.sql`. При переносе источником текущего поведения считать код и миграции, а не устаревший текст; сами документы обновлять отдельной согласованной задачей.
2. `docs/public-site-content.md` содержит старые URL (`/auth.html`, `/private-conditions.html`, `/privacy.html`, `/terms.html`, `/cookies.html`), которые не соответствуют текущим путям в HTML. Нужна последующая синхронизация документа с фактическими публичными маршрутами.
3. `docs/architecture/tools.md` утверждает наличие реализованного `tools.html` и UI, но соответствующего файла/JS модуля в текущем дереве нет. SQL registry migrations присутствуют; судьбу UI и применённость схемы следует выяснить отдельно, не восстанавливая функциональность по предположению.
4. Документация проектов упоминает milestones/tasks/history и расчёт готовности, но в текущем исполняемом дереве нет соответствующих модулей, а в проверенном наборе миграций нет их DDL. Это не доказывает отсутствие production таблиц.
5. Профиль пользователя распределён между Auth metadata и `user_profiles.display_name`; перед переносом определить единый профильный контракт и источник истины.
6. `pin_order` существует в миграции, но текущий UI/service используют только `is_pinned`; определить, нужен ли ручной порядок закреплённых проектов.
7. `createProjectFromIdea()` вставляет `completion_criteria`, не найденный в проверенных миграциях. Требуется сверка с реальной схемой до изменения контракта.
8. Текущие сервисы используют owner_id фильтры и Auth role check в UI, но полноценные негативные RLS tests для non-admin/non-owner не выполнялись.
9. Прямые ссылки/redirects MPA, callback URLs, hash navigation и browser history должны быть отдельно отображены в route migration map; механически заменить href недостаточно.

### 18.6. Обязательная общая тестовая матрица для каждого маршрута/сценария

Для каждого маршрута и use case в следующей таблице тестирования должны быть отмечены:
- **Happy path:** валидный пользовательский сценарий завершается ожидаемым результатом.
- **Validation:** пустые, неверные, слишком длинные и граничные значения.
- **Authentication:** anonymous, authenticated, expired session, re-authentication.
- **Authorization:** owner/admin, пользователь без нужного permission, другой project owner; backend/RLS denial.
- **Loading/empty:** первая загрузка, задержка, пустой результат, повторная загрузка.
- **Failure/recovery:** network/server error, retry только безопасной операции, восстановление UI и повторная проверка server state.
- **Concurrency/idempotency:** двойной submit, параллельные запросы, stale response, повторный action, конфликт обновления.
- **Navigation:** direct URL, refresh, back/forward, query/hash, внутренний и внешний переход.
- **Accessibility/responsive:** keyboard, focus management, labels/aria, touch, iOS Safari/mobile widths.
- **Data integrity/security:** отсутствие утечки данных между аккаунтами/проектами, отсутствие секретов в логах/URL/browser storage.

### 18.7. Классификация переноса

**Перенести с сохранением подтверждённого поведения:**
- публичные статические страницы и согласованный контент;
- Auth сценарии и Account settings;
- Owner Control Center overview;
- Ideas: создание, просмотр/редактирование, статусы, приоритет, архив, запуск;
- Projects: список, pause/resume, complete, archive/restore, pin, priority, delete.

**Перенести, но исправить до признания готовым:**
- Auth redirect/role routing (non-admin loop);
- Presentation → Supabase direct calls;
- atomicity launch/delete project workflows;
- единый профильный контракт;
- idea/project delete relationship safety;
- pin order semantics;
- неизвестность `completion_criteria` schema;
- hosting SPA fallback and direct route refresh;
- тестовая инфраструктура и негативные access/RLS tests.

**Не считать реализованным и не переносить как готовое:**
- Partner Workspace и External Project Workspace;
- user/partner/project permission management UI;
- application/admission workflow;
- payment/checkout/entitlements;
- Tools UI (до выяснения причины отсутствия);
- milestones/tasks/history UI and services;
- AI Business Analyst;
- monitoring, notification delivery, audit log and backup runtime.

### 18.8. Следующий контрольный этап

Функциональная инвентаризация текущих исходников и первичная матрица переноса завершены на статическом уровне. До выбора стека остаются отдельные технические подтверждения:
1. сверка актуальной production Supabase schema/RLS/grants только после отдельного разрешения на read-only audit;
2. уточнение GitHub Pages SPA fallback и фактических HTTP behavior;
3. определение окончательных route names и redirect contract;
4. открытие ADR: hosting/routing fallback, frontend stack/bundler, state management, testing strategy;
5. при необходимости — уточнение бизнес-правил для неатомарных project operations, profile source of truth, pin_order и удаления связанной идеи.

Ни один из этих пунктов не разрешает прикладную реализацию автоматически. До отдельного одобрения изменения остаются документальными.
