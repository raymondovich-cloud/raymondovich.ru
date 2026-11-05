# Функциональная инвентаризация и первичная карта миграции

**Дата:** 05.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`  
**Метод:** статическая проверка Git tree и содержимого файлов через GitHub API.  
**Ограничение:** это инвентаризация исходного кода, а не runtime-проверка поведения.

## 1. Сводка репозитория

В проверенном дереве обнаружено:

| Тип | Количество |
|---|---:|
| HTML | 16 |
| JavaScript | 15 |
| CSS | 2 |
| SQL migrations | 10 |
| GitHub Actions workflow files | 0 |
| package.json / Vite config / tsconfig | 0 |

Отсутствие файлов workflow и frontend package-конфигурации относится к проверенному Git tree данной ветки. Это не исключает внешние настройки GitHub Pages или настройки репозитория, которые не представлены файлами.

## 2. HTML entry points

| Текущий файл | Назначение по содержимому/пути | Наблюдаемая структура | Целевое направление |
|---|---|---|---|
| `index.html` | Публичная главная | Полная самостоятельная HTML-страница; один inline style block; два inline script blocks; отдельные sidebar scripts | Public Space route/view |
| `pages/about/about.html` | О проекте | Самостоятельная страница; inline CSS | Public Space / about |
| `pages/account/app.html` | Закрытое приложение / Control Center | Подключает app.css и app-page.js; одна форма | Owner Control Center shell + feature modules |
| `pages/auth/auth.html` | Вход | Форма авторизации, auth.css, auth-page.js | Auth routes |
| `pages/auth/register.html` | Регистрация | Форма регистрации, auth.css, register-page.js | Auth routes |
| `pages/auth/auth-callback.html` | Auth callback | callback-page.js, auth.css | Auth callback route |
| `pages/auth/reset-password.html` | Запрос сброса пароля | Форма, reset-password-page.js | Auth recovery route |
| `pages/auth/update-password.html` | Установка нового пароля | Форма, update-password-page.js | Auth recovery route |
| `pages/cooperation/cooperation.html` | Форматы сотрудничества | Самостоятельная страница; inline CSS и один inline script; sidebar scripts | Public Space / cooperation |
| `pages/products/products.html` | Продукты | Самостоятельная страница; inline CSS и один inline script; sidebar scripts | Public Space / products |
| `pages/profile/profile.html` | Профиль | Самостоятельная страница; inline CSS и один inline script; sidebar scripts | Partner/Account workspace — уточнить доступ и фактические операции |
| `pages/settings/settings.html` | Настройки аккаунта | Самостоятельная страница; inline CSS и один inline script; settings-page.js; три формы | Account settings feature |
| `pages/legal/cookies.html` | Политика cookies | Самостоятельная страница; inline CSS | Public legal route |
| `pages/legal/privacy.html` | Политика конфиденциальности | Самостоятельная страница; inline CSS | Public legal route |
| `pages/legal/private-conditions.html` | Условия приватного раздела | Самостоятельная страница; inline CSS | Legal route; проверить область применения |
| `pages/legal/terms.html` | Условия использования | Самостоятельная страница; inline CSS | Public legal route |

### Выявленные технические особенности HTML

- 10 из 16 HTML-файлов содержат inline `<style>` blocks: главная, about, cooperation, products, profile, settings и четыре legal pages. Остальные страницы используют внешние CSS-файлы или не содержат собственного style block.
- 4 страницы содержат inline scripts: главная, cooperation, products, profile и settings — фактически пять страниц. Остальные JS-подключения вынесены в отдельные файлы.
- Inline `style=` attributes в проверенных HTML не обнаружены.
- Большинство публичных страниц сейчас являются отдельными HTML documents, а не представлениями единого SPA router.
- Наличие абсолютных путей `/pages/...` и callback URL требует отдельной стратегии обратной совместимости при переходе на Hash Router.
- Нельзя удалять старые HTML entry points, пока не проверены старые ссылки, внешние закладки, OAuth redirects и recovery links.

## 3. JavaScript-модули

### Application / domain-facing services

| Файл | Подтверждённая ответственность по статическому анализу | Целевой модуль |
|---|---|---|
| `source/application/auth/authentication.js` | getSession, register, login, logout, getRole, reset password, update password, создание/обновление user_profiles; содержит абсолютные callback/recovery URL | application/auth |
| `source/application/account/account-session.js` | Завершение сессии | application/account |
| `source/application/account/account-settings.js` | Чтение и изменение email, имени, фамилии, timezone и пароля через Supabase Auth metadata | application/account |
| `source/application/ideas/idea-service.js` | CRUD идей; выборка по owner_id; поля планирования; статусы и приоритеты | application/ideas |
| `source/application/projects/project-service.js` | Список/изменение/удаление проектов; создание проекта из идеи; синхронизация статуса идеи; pin/priority/status | application/projects |

### Infrastructure

| Файл | Подтверждённая ответственность | Целевой модуль |
|---|---|---|
| `source/infrastructure/supabase/client.js` | Создаёт Supabase client с SDK из CDN ESM import | infrastructure/supabase |

### Presentation

| Файл | Подтверждённая ответственность | Целевой модуль |
|---|---|---|
| `source/presentation/app/app-page.js` | Главный Control Center UI; сессия, идеи, проекты, навигационные состояния, формы и диалоги; около 38 KB | presentation/owner-control-center; декомпозировать только на реальные feature responsibilities |
| `source/presentation/account/settings-page.js` | DOM-логика страницы настроек и трёх форм | presentation/account-settings |
| `source/presentation/account/sidebar-logout.js` | UI logout | shared account navigation |
| `source/presentation/account/sidebar-navigation.js` | Sidebar navigation interactions | shared navigation |
| `source/presentation/auth/auth-page.js` | UI входа | presentation/auth |
| `source/presentation/auth/register-page.js` | UI регистрации | presentation/auth |
| `source/presentation/auth/callback-page.js` | Обработка callback page | presentation/auth |
| `source/presentation/auth/reset-password-page.js` | UI запроса сброса пароля | presentation/auth |
| `source/presentation/auth/update-password-page.js` | UI обновления пароля и подтверждения полей | presentation/auth |

## 4. CSS и разделение представления

Обнаружены два внешних CSS-файла:

- `source/design/app.css` — стили закрытого приложения.
- `source/design/auth.css` — стили Auth screens.

Встроенные style blocks в публичных HTML необходимо перенести в отдельные файлы design layer с сохранением текущего визуального поведения. До переноса следует определить повторно используемые токены, компоненты и layout patterns; нельзя объединять разные страницы механически в один глобальный stylesheet.

Для JavaScript-модулей требуется отдельный аудит на динамическое создание style elements, inline style assignment и CSS-текст в template literals. Текущий этап подтверждает inline CSS в HTML, но не объявляет полный CSS-in-JS аудит завершённым.

## 5. Подтверждённые application use cases

### Authentication / account
- Получение текущей сессии.
- Регистрация с display name.
- Вход по email/password.
- Выход.
- Получение роли из `app_metadata.role` с fallback на `user`.
- Создание/обновление записи `user_profiles`.
- Запрос восстановления пароля.
- Обновление пароля.
- Изменение account metadata: first name, last name, timezone.
- Изменение email.

### Ideas
- Список идей владельца.
- Создание идеи с описанием и дополнительными planning fields.
- Обновление разрешённого набора полей.
- Удаление идеи.
- Сортировка по updated_at.
- Фильтрация и статусы в UI требуют дальнейшей проверки полной логики presentation-модуля.

### Projects
- Список проектов владельца.
- Создание проекта на основе идеи.
- Предотвращение повторного создания проекта для той же source_idea_id через предварительный lookup.
- Синхронизация статуса исходной идеи при запуске.
- Обновление проекта, включая status, priority и is_pinned.
- Удаление проекта и возврат исходной идеи к review.
- Важный риск: несколько операций выполняются последовательными запросами без серверной транзакции. Поведение при частичном отказе требует отдельной проверки; миграция UI не должна незаметно менять эту бизнес-семантику.

## 6. Первичная migration matrix

| Текущий компонент | Целевой слой / модуль | Ключевая зависимость | Проверка эквивалентности | Статус |
|---|---|---|---|---|
| Публичные HTML pages | Public Space route views | Router, design system | Сопоставление URL, контента, ссылок, responsive UI | INVENTORIED |
| Auth pages | Auth feature | Supabase Auth, callback/recovery URLs | Регистрация, вход, logout, callback, reset/update password | INVENTORIED |
| account settings page | Account feature | Supabase Auth user metadata | Загрузка/сохранение профиля, email, password, timezone | INVENTORIED |
| app-page.js | Owner Control Center features | Auth + ideas + projects services | Parity по всем состояниям, действиям, фильтрам и диалогам | PARTIAL — нужна детальная декомпозиция |
| idea-service.js | application/ideas | Supabase table ideas | CRUD, owner scoping, validation, status fields | INVENTORIED |
| project-service.js | application/projects | Supabase projects + ideas | CRUD, launch-from-idea, rollback behavior, pin/status | INVENTORIED |
| Supabase client | infrastructure/supabase | SDK, environment config | Session persistence, URL/config, error paths | INVENTORIED |
| Inline styles | design layer stylesheets | Existing CSS tokens/layouts | Visual regression across viewport sizes | NOT MIGRATED |
| Inline scripts | Presentation modules | Existing DOM behaviors | Behavior parity and no duplicate event handlers | NOT MIGRATED |
| Legacy URL paths | Router compatibility/redirect strategy | GitHub Pages + Hash Router | Deep links, OAuth callback, password recovery, external links | OPEN |

## 7. Вопросы, которые остаются открытыми

1. ADR-002 frontend stack не утверждён. Vue/Vite/TypeScript пока только proposal; package installation and app rewrite не начинались.
2. Нужна детальная инвентаризация функций внутри `app-page.js`: все виды экранов, фильтры, переходы, действия с идеями/проектами, подтверждения, ошибки, empty/loading states.
3. Нужен аудит фактической авторизации и прав доступа для каждого закрытого пространства. Название роли само по себе не доказывает серверную защиту.
4. Нужен полный аудит всех Supabase таблиц, RLS policies и связей с application use cases; миграции на этом этапе не менялись.
5. Требуется проверить внешние и внутренние ссылки на старые URL.
6. Не обнаружены package manager manifest, SPA build config или workflow YAML в проверенном дереве; целевой build/deploy pipeline ещё не существует в репозитории как проверенный факт.

## 8. Границы этой проверки

- Проверены наличие и содержимое перечисленных HTML, JS и CSS файлов.
- Проверено наличие 10 SQL migration files, но их содержимое и фактическое состояние production database в рамках этой инвентаризации не проверялись.
- Runtime поведение не запускалось.
- GitHub Pages deployment, OAuth provider settings, production Supabase policies, secrets и hosting configuration не изменялись.
- Никакая бизнес-функция не объявляется перенесённой.
- Эта карта предназначена для поэтапной миграции и уточнения тестовых критериев, а не для разрешения немедленного merge.

## 9. Следующий этап

1. Завершить глубокую инвентаризацию `app-page.js` и всех его пользовательских сценариев.
2. Проверить SQL migrations и сопоставить таблицы/policies с сервисами, не меняя backend.
3. Составить URL compatibility map для всех legacy routes и Auth redirects.
4. Подготовить обоснованный ADR-002 с вариантами и последствиями; не устанавливать stack до отдельного решения.
5. После утверждения toolchain — начать SPA shell и мигрировать один вертикальный сценарий за раз, с parity checks.
