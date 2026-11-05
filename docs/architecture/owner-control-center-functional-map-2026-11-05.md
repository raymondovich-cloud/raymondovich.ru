# Owner Control Center: функциональная карта и требования к миграции

**Дата:** 05.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`  
**Источник:** статический анализ текущего кода ветки; runtime-проверка не выполнялась.  
**Назначение:** зафиксировать поведение действующего Owner Control Center, которое должно быть сохранено при переносе в SPA. Legacy HTML/DOM-реализация не является целевой архитектурой.

> **Исторический baseline legacy MPA.** Файл описывает исходный `app-page.js` и его поведение до SPA-переноса. Он не описывает текущий SPA-код. Текущие маршруты, фактическая реализация Owner Control Center и оставшиеся ограничения указаны в `docs/architecture/merge-preparation-status-2026-11-05.md`.

## 1. Текущее состояние

Текущая реализация панели сосредоточена в `source/presentation/app/app-page.js` (642 строки, около 38,6 KB). Один модуль одновременно:
- находит DOM-элементы и создаёт dialogs;
- хранит состояние текущего экрана, фильтров и загрузки;
- формирует HTML-разметку экранов;
- обрабатывает навигацию и pointer/touch interactions;
- координирует use cases идей и проектов;
- отображает ошибки и статус операций.

Это подтверждённый пример чрезмерно крупного Presentation-модуля. При миграции нельзя просто перенести файл в SPA как один компонент. Его поведение нужно декомпозировать по экранным модулям, компонентам, presentation controllers/composables и application use cases. Domain/Application не должны импортировать DOM или UI framework.

## 2. Экранная модель и поведение

### 2.1. Overview / Центр управления
- Сводка входящих идей, активных проектов, проектов на паузе и приоритетных направлений.
- Список приоритетных идей (до трёх).
- Список недавно обновлённых активных/приостановленных проектов (до пяти).
- Список последних идей (до четырёх).
- Быстрые действия: запустить идею в проект; поставить проект на паузу/возобновить; переход в разделы идей и проектов.
- Пустые состояния для каждого блока.

### 2.2. Ideas / Пространство идей
- Рабочий список: статусы `new` и `review`.
- Отдельный архив: статус `archived`.
- Отдельный учёт запущенных идей: статус `launched`.
- Сводные счётчики: входящие, на рассмотрении, приоритетные, запущенные.
- Создание идеи с названием и кратким описанием; дополнительные необязательные поля:
  - цель;
  - ожидаемый доход;
  - примерные расходы;
  - бизнес-модель;
  - концепция;
  - дополнительная информация.
- Открытие карточки идеи и редактирование всех перечисленных полей.
- Контекстные действия: запуск в проект, отправка/снятие с рассмотрения, назначение/снятие приоритета, архивирование, восстановление, удаление.
- Для запущенной идеи доступ к действиям связанного проекта.
- Долгое нажатие на карточку открывает контекстное меню; обычное нажатие открывает детали. Нужно сохранить эквивалентное удобное поведение на touch, pointer и клавиатуре, но реализовать его в компонентной модели, а не переносить старые обработчики как есть.

### 2.3. Projects / Пространство проектов
- Разделение рабочих и архивных проектов.
- Статусы: `active`, `paused`, `completed`, `archived`.
- Сводные счётчики и пустые состояния.
- Данные проекта включают название, описание, цель, ожидаемый доход, оценку расходов, бизнес-модель, концепцию, дополнительную информацию, приоритет, плановые даты и признак закрепления.
- Действия: пауза/возобновление, приоритет, завершение, архивирование, восстановление, закрепление/открепление, удаление.
- Для проекта, созданного из идеи, хранится `source_idea_id`.
- Удаление проекта, связанного с идеей, пытается вернуть исходную идею в статус `review`.

### 2.4. Общие элементы
- Информация об аккаунте: отображаемое имя, роль, email, аватар-инициал.
- Выход из аккаунта.
- Адаптивная боковая навигация с мобильным backdrop.
- Account popover, закрытие по клику вне панели и Escape.
- Статусные сообщения об успешных операциях и ошибках.
- Диалоги создания идеи, просмотра/редактирования идеи и контекстных действий.
- Busy-state блокирует повторные действия на время операции.
- Текущие переключения Overview/Ideas/Projects выполняются только во внутреннем состоянии JavaScript. URL и browser history не отражают активный экран; перезагрузка возвращает начальный экран. В SPA это следует заменить централизованным Router и route registry, чтобы direct URL, back/forward и deep links имели предсказуемое поведение.

## 3. Application use cases, выявленные в коде

| Use case | Текущая реализация | Целевое размещение |
|---|---|---|
| Получить текущую сессию и роль | `authentication.js` | Application auth/session service |
| Получить идеи владельца | `idea-service.js:listIdeas` | Application query/use case + repository port |
| Создать идею | `idea-service.js:createIdea` | Application command + validation |
| Изменить идею | `idea-service.js:updateIdea` | Application command + validation |
| Удалить идею | `idea-service.js:deleteIdea` | Application command |
| Получить проекты владельца | `project-service.js:listProjects` | Application query/use case + repository port |
| Запустить идею в проект | `project-service.js:createProjectFromIdea` | Отдельный application use case с согласованной транзакционной семантикой |
| Изменить проект | `project-service.js:updateProject` | Application command + validation |
| Удалить проект и обработать исходную идею | `project-service.js:deleteProject` | Отдельный application use case с согласованной транзакционной семантикой |
| Изменить профиль/почту/пароль | `account-settings.js` | Application account use cases |

Текущие application services напрямую импортируют Supabase client. Для целевой Clean Architecture это инфраструктурная зависимость внутри Application: при миграции её следует инвертировать через repository/gateway ports и реализации в Infrastructure. Не нужно переносить прямые вызовы Supabase в новые UI-компоненты.

## 4. Состояние данных и ограничения текущей реализации

### 4.1. Идеи
- Таблица `public.ideas`.
- Владение через `owner_id`, FK на `auth.users(id)`.
- Статусы: `new`, `review`, `launched`, `archived`.
- Приоритет: `low`, `normal`, `high`, `critical`.
- `launched_at` обязателен при `status = 'launched'`.
- RLS включён миграцией `20261104144433_split_ideas_and_projects.sql`.
- Policy `admin manages ideas` разрешает authenticated-операции только если JWT `app_metadata.role = 'admin'` и `auth.uid() = owner_id`.
- На `authenticated` выданы SELECT/INSERT/UPDATE/DELETE.

### 4.2. Проекты
- Таблица `public.projects` существовала до миграций, представленных в репозитории.
- В репозитории есть миграции расширения статусов/полей и `source_idea_id`, а также закрепления проекта.
- Текущий frontend фильтрует запросы по `owner_id`; RLS должна независимо обеспечивать авторизацию на уровне БД.
- Полный исходный DDL, grants и RLS policy для `projects` в имеющемся наборе миграций не найден. Поэтому безопасность таблицы проектов нельзя считать подтверждённой только по репозиторию. Нужна отдельная проверка фактической схемы/политик в тестовом Supabase до выпуска, без изменения production.

### 4.3. Связь идеи и проекта: целостность
Текущий запуск идеи выполняется несколькими клиентскими запросами:
1. поиск существующего проекта по `source_idea_id`;
2. создание проекта;
3. обновление исходной идеи до `launched`;
4. при ошибке обновления идеи — best-effort удаление только что созданного проекта.

В базе есть unique partial index по `projects.source_idea_id`, который помогает предотвратить дубли. Однако последовательность не является одной атомарной транзакцией: возможны гонки и ошибки компенсационного удаления. Повторный запуск найденного проекта отдельно синхронизирует статус идеи.

Удаление проекта также состоит из двух операций: удаление проекта, затем перевод исходной идеи в `review`. Если второй запрос завершится ошибкой, проект уже будет удалён, а идея останется в прежнем состоянии. Это реальный риск частичного выполнения, который следует устранить на уровне backend use case/DB transaction, но не в рамках текущего статического аудита.

## 5. Auth и маршрутизация: подтверждённые точки совместимости

- Login: `/pages/auth/auth.html`.
- Registration: `/pages/auth/register.html`.
- Auth callback: `/pages/auth/auth-callback.html`.
- Password reset request: `/pages/auth/reset-password.html`.
- Password update: `/pages/auth/update-password.html`.
- Owner app: `/pages/account/app.html`.
- Authentication service содержит абсолютные redirect URLs на callback и update-password страницы домена `raymondovich.ru`.
- Owner app при отсутствии сессии или роли admin делает redirect на старый login URL.
- Logout также направляет на старый login URL.

При переходе к SPA эти пути нельзя просто удалить: нужно определить совместимые маршруты/redirect handling и проверить настройки Supabase Auth redirect allow-list. Redirect URLs и поведение recovery/callback являются миграционным контрактом. Production Auth settings не менять без отдельного разрешения.

## 6. Архитектурная декомпозиция для SPA

Предлагаемое разбиение по ответственности (названия каталогов — логические границы, не требование создавать пустые каталоги):

- **Owner Overview module:** query model + overview page + summary/list components.
- **Ideas module:** list/archive views, idea editor, idea details, action menu, status/priority rules.
- **Projects module:** list/archive views, project details/actions, pinning, status/priority rules.
- **Account/session module:** current identity, role presentation, account menu, logout.
- **Shared presentation:** dialogs, form controls, empty/loading/error states, status notifications, responsive navigation.
- **Application:** explicit use cases for idea/project lifecycle; DTO mapping; validation; typed errors.
- **Domain:** idea/project entities, status transitions, priority rules and lifecycle invariants, without Supabase/DOM/framework imports.
- **Infrastructure:** Supabase repositories and, where required, transactional database functions/RPC or Edge Function adapters.
- **Routing:** one route registry, workspace/layout metadata, authorization UX guards, lazy route loading; backend RLS remains authoritative.

## 7. Обязательные миграционные parity checks

- [ ] Owner-only access: unauthenticated and non-admin sessions cannot enter Owner Control Center.
- [ ] Overview counts, priority items, recent ideas and projects.
- [ ] Idea create with all optional planning fields.
- [ ] Idea detail read/edit with correct null/empty handling and validation.
- [ ] Idea review toggle, priority toggle, archive/restore, delete.
- [ ] Launch idea to project with all planning data copied and source relation preserved.
- [ ] Duplicate launch protection and concurrent launch behaviour.
- [ ] Project active/paused/completed/archive/restore lifecycle.
- [ ] Project priority and pin/unpin.
- [ ] Project delete + source idea restoration consistency.
- [ ] Mobile long-press/context actions and keyboard equivalent.
- [ ] Dialog focus, Escape, backdrop and focus restoration.
- [ ] Loading, empty, success and error states.
- [ ] Login/register/callback/password reset/password update/logout.
- [ ] Direct route load, refresh, back/forward and legacy URL compatibility.
- [ ] iOS Safari touch behavior and safe-area layout.
- [ ] Actual database RLS/grants verified in isolated test environment.

## 8. Ограничения доказательности

Это статический анализ содержимого ветки. Он не подтверждает:
- что все сценарии успешно выполняются в браузере;
- что production Supabase schema совпадает с SQL файлами репозитория;
- что все RLS policies и grants фактически применены;
- что Supabase Auth redirect allow-list содержит все текущие URLs;
- что текущие ссылки на старые страницы не используются извне;
- что приложение корректно работает на всех версиях iOS Safari.

Ни одна база данных, Auth-конфигурация, DNS, hosting или production deployment в рамках этой работы не изменялись.
