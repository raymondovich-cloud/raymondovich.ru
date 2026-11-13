<!-- document-version: 1.0 -->

# GitHub Read-only — техническое задание инструмента

**Проект:** raymondovich.ru  
**Модуль:** Tools / Development Tools / GitHub  
**Версия:** 1.0  
**Статус:** подготовлено для проверки владельцем; реализация не начата  
**Дата:** 2026-11-13

## 1. Назначение и границы

GitHub Read-only — первый внешний инструмент каталога Raymondovich. Он позволяет просматривать репозитории, доступные через установленное GitHub App, без возможности изменять GitHub.

### Входит в первую версию

- Подключение GitHub account или organization через установку GitHub App.
- Список репозиториев, выбранных при установке.
- Просмотр метаданных репозитория, веток, коммитов и файлов.
- Просмотр Issues, Pull Requests, комментариев, reviews и diff/patch, если эти данные доступны через API.
- Проверка состояния установки и доступности репозиториев.
- Отвязка GitHub installation от аккаунта Raymondovich.

### Не входит

- Создание, изменение и удаление файлов, веток, тегов, коммитов, Releases, Issues, комментариев и Pull Requests.
- Merge, approve, review submission, закрытие/переоткрытие Issues и PR.
- Изменение настроек репозитория, collaborators, branch protection, Actions, workflows, secrets и webhooks.
- Запуск GitHub Actions, чтение Actions logs, Git push.
- OAuth-доступ от имени GitHub-пользователя, чтение его email/профиля и получение user access token.
- Платежи и автоматическая выдача entitlement.
- Привязка репозитория к проекту Raymondovich: Projects/RBAC пока не имеют утверждённой доменной модели.

Любая write-возможность требует отдельного изменения scope и повторного согласования GitHub App permissions. Запрещено добавлять write permissions «на будущее».

## 2. Позиционирование в Tool Management Core

- Постоянный tool_id: github.
- Категория: development-tools.
- Интеграционный ключ: github-app.
- Название в каталоге: GitHub.
- Папка Domain: source/domain/tools/development-tools/github/.
- Папка Infrastructure: source/infrastructure/tools/github/.
- Папка Application: source/application/tools/github/.
- Серверные endpoints: supabase/functions/github-*/.
- Визуальная реализация, если потребуется, использует только source/design-system/.

Контракт инструмента регистрируется в общем Tool Registry после утверждения документа и готовности вертикального среза. Существующие vendor folders сами по себе не являются продуктовыми инструментами.

Личный доступ пользователя к инструменту и подключение репозитория к проекту — разные уровни. Первая версия реализует личное GitHub-подключение и список репозиториев. Project activation отложен до утверждения Projects/RBAC.

## 3. GitHub App и минимальные permissions

Использовать GitHub App. Не использовать Personal Access Token как основной механизм.

Обязательные repository permissions:

| Permission | Уровень | Назначение |
|---|---|---|
| Metadata | Read-only | Метаданные и идентификаторы репозитория |
| Contents | Read-only | Просмотр файлов и содержимого |
| Issues | Read-only | Issues, issue comments |
| Pull requests | Read-only | PR, reviews, review comments и diff |

Другие repository, organization, account и enterprise permissions не запрашивать. В частности, не запрашивать Actions, Workflows, Administration, Secrets, Deployments, Checks, Commit statuses, Members и Contents write.

Использовать только встроенный webhook GitHub App для событий установки. Не создавать или изменять webhooks в репозиториях.

При регистрации приложения настроить App ID, App slug, Setup URL, Webhook URL, webhook secret и private key. Client ID не добавлять, если он не требуется выбранному механизму.

Private key и webhook secret хранятся только в Supabase Edge Function secrets. Секреты, App JWT и installation token не попадают в Git, frontend bundle, browser storage, URL, логи или клиентские ответы.

## 4. Установка и защита callback

### 4.1 Начало установки

1. Пользователь входит в Raymondovich через Supabase Auth.
2. Клиент вызывает серверный endpoint начала установки с действующей Supabase-сессией.
3. Сервер проверяет JWT через Supabase Auth getUser(); user_id из тела запроса не считается доверенным.
4. Сервер генерирует криптографически случайный одноразовый state с энтропией не менее 256 бит.
5. В базе сохраняется только хеш state, user_id, created_at и expires_at. Срок жизни — 10 минут.
6. Сервер возвращает URL установки GitHub App с параметром state; клиент перенаправляет пользователя на GitHub.

### 4.2 Возврат после установки

GitHub App использует Setup URL, а не OAuth callback. GitHub передаёт параметры установки, включая installation_id и state.

Setup URL endpoint обязан:
1. Проверить наличие и формат параметров.
2. Найти неиспользованный и неистёкший state по хешу.
3. Атомарно погасить state; повторное использование запрещено.
4. Создать App JWT на сервере из App ID и private key.
5. Проверить installation через GitHub REST API от имени App и подтвердить, что установка существует и относится к ожидаемому App.
6. Получить installation token и список доступных installation repositories.
7. Сохранить связь installation ↔ Supabase user, используя user_id из серверной записи state.
8. Сохранить только безопасные метаданные installation и account. Токен не сохранять.
9. Перенаправить пользователя на страницу инструментов Raymondovich.

Не считать installation_id из URL доказательством подлинности: это недоверенный ввод. Проверять installation через GitHub API с App JWT. State связывает callback с инициированным аутентифицированным процессом Raymondovich. Продукт не утверждает, что Supabase user и GitHub account — одно лицо; GitHub email не запрашивается и не сохраняется.

Если callback пришёл без корректного state, installation не привязывать. Для восстановления пользователь запускает установку заново.

Не включать request_oauth_on_install: OAuth-пользовательская авторизация не нужна для доступа к репозиториям installation.

## 5. Серверная авторизация и GitHub API

Все GitHub API вызовы выполняются только серверными Edge Functions. Frontend никогда не получает App private key, App JWT или installation token.

Перед каждым запросом:
1. Проверить Supabase Bearer JWT через auth.getUser().
2. Найти installation mapping только по текущему user_id.
3. Проверить состояние installation.
4. Выпустить краткоживущий installation access token через POST /app/installations/{installation_id}/access_tokens.
5. По возможности ограничить token только repository IDs и permissions, необходимыми конкретному запросу.
6. Выполнить только разрешённый GET endpoint GitHub API.
7. Нормализовать ответ до минимального DTO для UI.
8. Не возвращать токен, внутренние ошибки, секреты или лишние поля GitHub API.

Installation access token обычно действует один час. В MVP не сохранять его: получать по требованию и держать только в памяти выполнения запроса. Любое будущее кеширование должно быть серверным, с коротким TTL и без клиентского доступа.

### 5.1 Allowlist операций

Разрешить только GET:
- список репозиториев установки: GET /installation/repositories;
- метаданные: GET /repos/{owner}/{repo};
- содержимое и Git trees;
- ветки: GET /repos/{owner}/{repo}/branches;
- коммиты: GET /repos/{owner}/{repo}/commits;
- Issues и issue comments;
- Pull Requests, PR details, reviews, review comments и files/patches.

Список является allowlist, а не произвольным proxy к api.github.com. Запретить POST, PUT, PATCH, DELETE и GraphQL mutations на уровне адаптера. Не читать .github/workflows и не обращаться к Actions API.

### 5.2 Пагинация и ограничения

- Обрабатывать GitHub Link pagination; не считать первую страницу полным результатом.
- Установить page size и максимальное число страниц на один запрос.
- Для больших списков использовать постраничную загрузку.
- Обрабатывать rate limit и secondary rate limit с корректным retry-after; не выполнять бесконечные повторы.
- Не кешировать приватное содержимое между разными пользователями или installations.
- Безопасно обрабатывать 401/403/404, не раскрывая существование недоступного приватного ресурса.

## 6. Хранение данных

Таблицы размещаются в схеме private, недоступной напрямую через публичный Supabase Data API. Перед миграциями проверить реальные схемы, grants, RLS и текущую auth-модель.

### 6.1 private.github_installation_states

Поля:
- id;
- user_id → auth.users.id;
- state_hash;
- expires_at;
- consumed_at;
- created_at.

Обязательны уникальность state_hash, одноразовое атомарное потребление и очистка истёкших записей.

### 6.2 private.github_installations

Поля:
- id;
- user_id → auth.users.id;
- installation_id (уникальный GitHub App installation ID);
- account_id;
- account_login;
- account_type (User/Organization);
- repository_selection (selected/all);
- granted_permissions;
- status (active/suspended/removed/reauthorization-required);
- installed_at;
- last_verified_at;
- created_at;
- updated_at.

Одна installation не должна молча привязываться к нескольким независимым Supabase users. Если она уже связана с другим user_id, вернуть конфликт и потребовать отдельного безопасного решения. Совместное использование installation между пользователями в MVP не реализовывать.

### 6.3 Репозитории

В MVP список доступных репозиториев получать из GitHub API. Не создавать локальную таблицу-копию без подтверждённой необходимости. GitHub остаётся источником истины о доступе.

### 6.4 Доступ к приватным данным

- Не выдавать клиенту grants на таблицы private.
- Edge Functions используют service role только после проверки пользователя и серверной авторизации.
- RPC не принимает произвольный user_id от клиента как основание доступа.
- Service role key доступен только серверным функциям и не логируется.
- Миграции не создавать до утверждения документа и проверки текущей схемы.

## 7. Webhooks и жизненный цикл

Настроить встроенный webhook GitHub App. Проверять X-Hub-Signature-256 по исходному raw body с constant-time comparison.

Обрабатывать только:
- installation.created;
- installation.deleted;
- installation.suspend;
- installation.unsuspend;
- installation.new_permissions_accepted;
- installation_repositories.added;
- installation_repositories.removed.

Проверять подпись до обработки payload. Обрабатывать повторные доставки идемпотентно. Тяжёлую синхронизацию не выполнять в webhook request.

При удалении или suspension немедленно блокировать дальнейшие запросы. При изменении списка репозиториев актуальный доступ перепроверять через GitHub API. При изменении permissions сверять фактические разрешения с требуемым минимумом.

## 8. Отвязка и удаление

Пользователь может отвязать installation от Raymondovich. Это удаляет или деактивирует внутреннюю связь, но не удаляет GitHub App из GitHub account и не меняет настройки GitHub. UI должен объяснять это различие.

После отвязки новые API-запросы запрещены, токены не сохраняются, внутренние state/installation metadata удаляются или деактивируются по принятой политике. При событии installation.deleted связь немедленно помечается removed. Аудит не удаляется обычной операцией.

## 9. Ошибки и UX-состояния

Предусмотреть состояния:
- GitHub не подключён;
- переход к установке;
- подключение подтверждено;
- установка приостановлена;
- приложение удалено в GitHub;
- не хватает read permissions;
- репозиторий больше недоступен;
- GitHub временно недоступен или ограничил rate limit;
- installation уже связана с другим Raymondovich user;
- callback/state не прошёл проверку.

UI показывает короткие понятные сообщения. Stack traces, API headers и секреты остаются в защищённых серверных логах. Логи маскируют Authorization headers, state и токены.

## 10. Тестирование

Обязательные проверки:
1. State генерируется криптографически стойким генератором и хранится только в виде хеша.
2. Просроченный, неизвестный и повторно использованный state отклоняется.
3. Callback не доверяет installation_id без проверки через GitHub App JWT.
4. Installation другого Supabase user не перепривязывается автоматически.
5. Неаутентифицированный запрос не получает список репозиториев.
6. Подмена installation ID не даёт доступ к чужой установке.
7. Private key и installation token отсутствуют в frontend bundle и ответах API.
8. Адаптер отклоняет HTTP methods кроме GET.
9. Allowlist блокирует произвольные URL, write endpoints и Actions API.
10. Webhook с неверной подписью отклоняется; повторное событие безопасно.
11. Installation deleted/suspended блокирует запросы.
12. Пагинация и rate limit обрабатываются без бесконечных циклов.
13. Ошибки GitHub не раскрывают приватные данные и токены.
14. Изменение выбранных репозиториев отражается при следующем обновлении списка.

Использовать mock GitHub API и тестовые ключи. Тесты не должны требовать production GitHub App secrets.

## 11. Критерии приёмки

Первый вертикальный срез готов, если:
- аутентифицированный пользователь начинает установку GitHub App;
- callback валидирует одноразовый state и подлинность installation;
- installation связывается с правильным Supabase user;
- сервер получает только репозитории, разрешённые installation;
- можно читать метаданные и содержимое доступного репозитория;
- токены и private key никогда не передаются клиенту;
- все GitHub API операции ограничены GET allowlist;
- удаление/suspension installation блокирует запросы;
- проверки доступа и тесты проходят;
- UI не содержит действий изменения GitHub.

## 12. Этапы реализации

1. Проверить Supabase проект, миграции, Edge Functions, секреты и auth boundaries. Секреты не читать и не выводить.
2. Утвердить это ТЗ и конфигурацию GitHub App.
3. Создать только необходимые private tables и server functions после проверки схемы.
4. Срез A: begin installation → state → Setup URL callback → безопасная installation mapping.
5. Срез B: installation token → список репозиториев → метаданные репозитория.
6. Срез C: branches, commits, file contents, Issues и Pull Requests read-only.
7. Webhooks, lifecycle, отвязка и аудит.
8. Проверка staging/preview и отдельное разрешение владельца перед production activation.

Не выполнять этапы одним большим коммитом. Не менять Supabase проекты AI System или LifeGame.

## 13. Официальная документация

- https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
- https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url
- https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- https://docs.github.com/en/rest/apps/installations
- https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps
- https://docs.github.com/en/webhooks/webhook-events-and-payloads
