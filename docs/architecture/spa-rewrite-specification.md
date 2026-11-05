<!-- version 0.1-draft -->

# Техническое задание: полная архитектурная переработка Raymondovich.ru (MPA → SPA)

**Статус:** рабочая спецификация, draft 0.1  
**Дата:** 05.11.2026  
**Репозиторий:** raymondovich-cloud/raymondovich.ru  
**Рабочая ветка:** architecture/spa-rewrite-2026-11-05  
**Базовый commit:** 89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4  
**Резервная ветка:** backup/pre-spa-rewrite-2026-11-05  
**Область действия:** только Raymondovich.ru.

> Документ задаёт требования к проектированию и реализации новой архитектуры. Он не разрешает менять production, Supabase, DNS, Cloudflare или конфигурацию хостинга. Все изменения выполняются только в рабочей ветке до отдельного прямого разрешения владельца на переход к main.

## 1. Цель

Перевести Raymondovich.ru с MPA (набора независимых HTML-документов) на полноценное SPA с собственным маршрутизатором, сохранив существующие пользовательские сценарии, бизнес-правила, данные, безопасность и визуальную идентичность.

Задача не ограничивается созданием Router. Требуется переработать точки входа, маршрутизацию, жизненный цикл страниц, композицию интерфейса, загрузку модулей, управление состоянием, интеграционные границы, тестирование и документацию.

Новая архитектура должна стать устойчивой основой публичной платформы и закрытого Control Center.

## 2. Неизменяемые границы и правила работы

1. Вся разработка, рефакторинг, тестирование и исправления выполняются только в ветке architecture/spa-rewrite-2026-11-05 либо в согласованных вспомогательных ветках, созданных от неё.
2. main не изменяется в ходе разработки.
3. Merge, PR для интеграции, возврат на main и deployment выполняются только после прямого указания владельца.
4. Резервная ветка backup/pre-spa-rewrite-2026-11-05 сохраняется без изменений.
5. Репозиторий raymondovich.online не входит в область работ.
6. Production Supabase, Auth settings, таблицы, данные, RLS, grants, Edge Functions, DNS, Cloudflare, домены и hosting не изменяются без отдельного согласования.
7. Секреты, service-role keys, access tokens и иные учётные данные не добавляются в Git.
8. Нельзя удалять существующую функциональность только потому, что её неудобно переносить. До замены поведения необходимо описать его назначение, зависимости и пользовательский сценарий.
9. Если обнаружена неработающая или противоречивая функция, фиксируются факт, доказательства и варианты решения. Удаление не маскируется под рефакторинг.

Исполнитель имеет свободу выбирать архитектуру, структуру модулей, библиотеки и инструменты, если выбор обоснован, соответствует требованиям и не нарушает границы безопасности и production. Существенные решения фиксируются в ADR.

## 3. Исходная точка

Статический снимок Git-состояния находится в:
- docs/architecture/current-state-2026-11-05.md
- docs/changes/2026-11-05-current-state-snapshot.md

На момент снимка подтверждены:
- 16 HTML-точек входа;
- отсутствие общего SPA Router;
- навигация преимущественно через ссылки на отдельные HTML-документы;
- ES modules в source/;
- слои application, domain, infrastructure, presentation, core и design;
- Supabase JS SDK 2.117.3, подключённый через jsDelivr;
- отдельные Auth callback и password recovery URLs;
- Control Center с Overview, Ideas и Projects;
- SQL migration history;
- отсутствие обнаруженных в Git-дереве package.json, lockfile, build config, GitHub Actions workflow и SPA fallback-файла.

Это статические наблюдения, а не подтверждение runtime-поведения, production Supabase, DNS/CDN или хостинга.

Документ docs/architecture/target-architecture.md содержит прежнее предложение сохранять MPA. Настоящее ТЗ supersedes его в части модели приложения и маршрутизации. Принципы Clean Architecture сохраняются, если не противоречат этому ТЗ.

## 4. Целевая архитектура SPA

### 4.1. Application shell

Создать одну основную HTML-точку входа SPA. Shell отвечает за bootstrap, композицию приложения, подключение Router, корневой DOM-контейнер, общие стили и глобальную обработку ошибок.

Публичная часть, Auth и Control Center могут иметь независимые layouts, но должны использовать согласованные общие механизмы.

### 4.2. Router

Реализовать единый Router на базе History API либо выбрать проверенную библиотеку по результатам ADR. Требования:
- централизованный реестр маршрутов;
- сопоставление статических и динамических сегментов пути;
- query string и hash;
- программная навигация;
- перехват только подходящих внутренних ссылок;
- поддержка popstate, Back и Forward;
- прямой вход по URL и refresh;
- 404 для неизвестного маршрута;
- обработка ошибок загрузки и рендеринга;
- защита от гонок при быстрой последовательной навигации;
- очистка обработчиков, подписок и ресурсов при уходе со страницы;
- корректное управление scroll и focus;
- сохранение стандартного поведения внешних ссылок, загрузок и специальных ссылок;
- безопасная обработка redirect target.

Router не содержит бизнес-логику, запросы Supabase, правила доступа к данным или разметку конкретных страниц.

### 4.3. Реестр маршрутов

Каждая запись маршрута должна явно определять:
- идентификатор и path/pattern;
- layout;
- lazy loader страницы, если применимо;
- требования доступа/guard;
- metadata: title, description, canonical, robots;
- политику scroll/focus при необходимости.

Нельзя распределять сопоставление URL по случайным обработчикам страниц.

### 4.4. Lifecycle и загрузка

Страница должна иметь определённые этапы mount, загрузки данных, отображения loading/empty/error/success, реакции на параметры URL и cleanup при уходе.

Code splitting применять по маршрутам или функциональным областям там, где это действительно уменьшает initial bundle. Не создавать абстракции без конкретной ответственности.

Состояние, которое должно переживать навигацию, хранить в URL, application/session state или backend согласно его семантике. Не полагаться на сохранение DOM предыдущей страницы.

### 4.5. Layouts

Минимально предусмотреть layouts:
- публичной части;
- аутентификации;
- закрытого Control Center.

Оболочка Control Center не должна знать внутреннюю реализацию каждого функционального раздела.

## 5. Обязательный функциональный объём

Минимальный перечень исходных HTML-точек входа:

| Исходный файл | Сценарий |
|---|---|
| index.html | Публичная главная |
| pages/about/about.html | О платформе |
| pages/products/products.html | Продукты |
| pages/cooperation/cooperation.html | Сотрудничество |
| pages/profile/profile.html | Профиль |
| pages/settings/settings.html | Настройки |
| pages/account/app.html | Control Center |
| pages/auth/auth.html | Вход |
| pages/auth/register.html | Регистрация |
| pages/auth/reset-password.html | Запрос сброса пароля |
| pages/auth/update-password.html | Установка нового пароля |
| pages/auth/auth-callback.html | Callback авторизации |
| pages/legal/privacy.html | Политика конфиденциальности |
| pages/legal/terms.html | Условия использования |
| pages/legal/cookies.html | Политика cookies |
| pages/legal/private-conditions.html | Условия закрытого пространства |

Список является минимальным. До переноса требуется дополнить его точными действиями, состояниями, проверками, DOM-контрактами и зависимостями.

### 5.1. Control Center

Сохранить и перенести фактическое поведение:
- оболочка и навигация;
- Overview, Ideas и Projects;
- создание, просмотр, редактирование, архивирование и иные существующие операции;
- формы, валидация, подтверждения и уведомления;
- loading, empty, error и success states;
- переходы между связанными сущностями;
- профиль, настройки и выход.

Наличие нового экрана не доказывает перенос функциональности. Проверяются реальные операции и результат в данных.

### 5.2. Публичные страницы

Сохранить контент, ссылки, CTA, адаптивность, визуальные состояния и утверждённые бизнес-формулировки. Не менять позиционирование без отдельного согласования.

### 5.3. Матрица переноса

До удаления старых HTML и модулей составить матрицу:
- исходная страница/маршрут;
- роль пользователя;
- действие;
- предусловия;
- ожидаемый результат;
- application use case;
- интеграции;
- ошибки и edge cases;
- подтверждающий тест.

Статусы: обнаружено, перенесено, проверено, заблокировано, исключено по согласованию.

## 6. URL, hosting и SEO

### 6.1. Предварительная карта чистых URL

- /
- /about
- /products
- /cooperation
- /profile
- /settings
- /account
- /auth/login
- /auth/register
- /auth/reset-password
- /auth/update-password
- /legal/privacy
- /legal/terms
- /legal/cookies
- /legal/private-conditions

Это предварительный вариант. Окончательный контракт фиксируется после аудита внешних ссылок, Auth flows и SEO.

### 6.2. Совместимость старых URL

Для старых .html адресов выбрать и проверить стратегию: redirect, compatibility entry point или иной надёжный механизм. Нельзя удалять старые адреса без оценки внешних ссылок и обратной совместимости.

### 6.3. Hosting fallback

Исследовать фактическую цепочку DNS/CDN/hosting и проверить прямой запрос и refresh вложенного URL. Сравнить:
- GitHub Pages и его ограничения;
- 404.html fallback;
- Cloudflare Worker/Pages Functions или другой edge rewrite;
- иной static hosting с поддержкой SPA rewrites;
- гибридную стратегию с отдельными entry points.

Решение оформить ADR. Production DNS, Cloudflare и hosting не менять в рамках обычного rewrite.

### 6.4. SEO

Для публичных маршрутов определить уникальные title/description, canonical, robots, Open Graph metadata, sitemap и robots.txt. Проверить требования к индексации и social previews. Оценить ограничения client-side SPA; при необходимости рассмотреть prerendering, SSG, SSR или гибридную модель. Одного document.title недостаточно для полноценной SEO-стратегии.

## 7. Supabase Auth

Текущие URL, зафиксированные в snapshot:
- callback: https://raymondovich.ru/pages/auth/auth-callback.html
- recovery: https://raymondovich.ru/pages/auth/update-password.html

Не менять их в production без отдельного разрешения.

Сохранить сценарии:
- sign in и sign up;
- подтверждение email;
- callback/code exchange;
- password recovery и update;
- sign out;
- восстановление сессии после перезагрузки;
- истечение/обновление сессии;
- ошибки и повторный callback.

Callback должен обрабатываться до обычного protected-route redirect, чтобы не терять auth code и recovery parameters.

Route guards — UX-механизм, а не граница безопасности. Защита данных обеспечивается backend, RLS и grants.

Не использовать редактируемые user metadata для авторизации; учитывать обновление JWT claims после изменения app_metadata; не доверять role/owner_id из браузера; не раскрывать секретные ключи; не помещать токены в логи, аналитику или небезопасные URL.

## 8. Supabase Database и контракты данных

Supabase остаётся инфраструктурой, но не должен протекать в Domain/Application.

Требования:
1. SDK и сетевые запросы находятся в infrastructure adapters.
2. Application использует порты/контракты.
3. Presentation не обращается к Supabase напрямую.
4. Database DTO преобразуются во внутренние модели.
5. Сначала инвентаризировать миграции и data contracts.
6. Не утверждать, что миграции применены в production без проверки.
7. Не выполнять production migrations и не менять данные в рамках frontend rewrite.
8. Не менять таблицы Ideas/Projects, связи и статусы ради удобства новой архитектуры.

Расхождение документации Ideas/Projects с миграционной историей, указанное в snapshot, требует отдельного доменного решения и проверки фактической схемы.

Если возникнет необходимость DB change, подготовить отдельное предложение с причиной, схемой до/после, совместимостью, backfill, RLS/grants, тестами и rollback. Не применять автоматически.

## 9. Clean Architecture и модульность

Сохранить и уточнить слои:
- Domain: сущности, value objects, инварианты и доменные правила.
- Application: use cases, orchestration и ports.
- Infrastructure: Supabase, browser APIs, network и storage adapters.
- Presentation: Router, layouts, pages и UI orchestration.
- Design System: tokens, typography, components и layouts без бизнес-логики.
- Core: только реально общие технические контракты.

Направление зависимостей: presentation → application → domain. Infrastructure реализует порты внутренних слоёв. Domain не импортирует внешние слои; Application не зависит от DOM, Supabase SDK и browser APIs; Design не зависит от бизнес-слоёв. Циклические зависимости запрещены.

Не создавать универсальные свалки utils/common/helpers, не дробить код механически и не заменять один монолит другим. Каждый модуль имеет ясную ответственность и публичный контракт.

## 10. Design System

Создать единый источник:
- цветовых и типографических токенов;
- spacing scale;
- радиусов, теней и границ;
- кнопок, полей, карточек, диалогов;
- навигации;
- loading, empty, error и feedback states;
- адаптивных layout-паттернов.

Сохранить визуальную идентичность Raymondovich: тёмная основа, оранжевые акценты/градиенты, лаконичный премиальный интерфейс.

Не допускать необоснованного CSS-in-JS, дублирования компонентов, бизнес-логики в UI и случайного размножения inline CSS/JS. Проверять мобильные устройства и Safari.

## 11. Выбор стека и ADR

Не предписывать заранее конкретный framework или bundler. До реализации подготовить ADR по:
- vanilla ES modules против framework;
- собственный Router против библиотеки;
- build tool и code splitting;
- hosting/fallback;
- state management;
- CSS architecture;
- тестовому стеку;
- SEO/prerendering.

Критерии: поддерживаемость, безопасность, размер runtime/bundle, мобильная производительность, совместимость с hosting, тестируемость, простота сопровождения и отсутствие неоправданной сложности.

Если вводятся зависимости, фиксировать версии и lockfile.

## 12. Ошибки и состояние

Предусмотреть глобальную обработку ошибок и отдельные состояния:
- route not found;
- route load failure;
- data load failure;
- authorization failure;
- network failure.

Пользовательские сообщения не должны раскрывать приватные данные. Логи не должны содержать токены или чувствительные payload. Предусмотреть отмену устаревших запросов, защиту от дублей и cleanup. Не показывать успех сохранения без подтверждения backend.

## 13. Тестирование

### Router
- exact/dynamic routes;
- query/hash;
- 404;
- push/replace;
- Back/Forward;
- repeated navigation;
- direct URL и refresh;
- lazy-load failure;
- lifecycle cleanup;
- protected/public routes;
- external links и downloads.

### Auth
- login/register;
- email confirmation callback;
- password recovery/update;
- session restoration/expiry;
- logout;
- unauthorized/non-admin;
- redirect preservation и callback edge cases.

### Functional
- публичная навигация и CTA;
- профиль и настройки;
- все обнаруженные CRUD-сценарии Ideas/Projects;
- Control Center navigation;
- validation, errors и empty states;
- сохранение и повторное чтение данных;
- responsive behavior.

### Security
- anonymous, authenticated non-admin и admin сценарии;
- RLS enforcement;
- отсутствие privileged keys в клиентском bundle;
- отсутствие обхода доступа через прямой URL/API;
- XSS/unsafe HTML handling;
- open redirect и утечки токенов.

### Общие проверки
- unit tests для чистых функций/use cases;
- integration tests для adapters/application;
- browser E2E для критичных сценариев;
- accessibility: keyboard, focus, labels, contrast;
- мобильный Safari;
- performance и initial bundle;
- циклические импорты и архитектурные ограничения.

Тестовые аккаунты и данные должны быть изолированы от production. Не выполнять destructive tests на production пользователях.

## 14. Этапы выполнения

**Этап 0 — инвентаризация:** карта HTML/CSS/JS, imports, inline scripts, selectors, links, реальные сценарии, hosting/runtime проверки, список неизвестных.

**Этап 1 — архитектурные решения:** ADR, route map, выбор стека, hosting strategy, SEO, state, миграционный подход.

**Этап 2 — базовая платформа:** SPA shell, Router, registry, layouts, lifecycle, error handling, тесты Router и проверка direct URL/refresh в тестовом hosting.

**Этап 3 — application/infrastructure:** порты, adapters, Auth, session lifecycle, repositories, изолированные тесты.

**Этап 4 — перенос функциональности:** публичные страницы, Auth, Control Center, Ideas, Projects, Profile/Settings, Legal и старые URL.

**Этап 5 — стабилизация:** регрессия, security, accessibility, performance, hosting/SEO, документация и rollback.

**Этап 6 — приёмка:** отчёт владельцу с доказательствами и списком ограничений. Не выполнять merge/deploy. Ждать прямого разрешения владельца.

Этапы могут уточняться по результатам аудита, но обязательные проверки нельзя пропускать.

## 15. Rollback

Подготовить:
- точную точку возврата frontend;
- стратегию старых URL;
- план восстановления hosting routing;
- доказательство отсутствия необратимых DB изменений;
- для отдельно одобренных DB changes — backup, migration plan и проверенный restore.

До разрешения deployment всё проверяется в локальной или изолированной staging среде.

## 16. Документация и change management

Значимые решения фиксировать ADR в docs/architecture/decisions/:
- контекст;
- проблема;
- рассмотренные варианты;
- решение;
- последствия;
- статус proposed/accepted/superseded.

Каждая рабочая сессия сопровождается changelog в docs/changes/YYYY-MM-DD-*.md с перечнем изменений, причин, файлов, проверок, непроверенных областей, рисков и следующего шага.

Не заявлять о тестировании без фактического выполнения. Не считать функцию завершённой до проверки пользовательского сценария.

## 17. Критерии приёмки

Rewrite готов к рассмотрению владельцем, когда:
1. Router покрыт автоматизированными тестами.
2. Все утверждённые маршруты открываются напрямую и после refresh в тестовой среде.
3. Back/Forward работают корректно.
4. Все существующие согласованные сценарии перенесены либо явно заблокированы/исключены с причиной.
5. Auth callback и recovery проверены.
6. Права обеспечиваются backend/RLS, а не только UI guards.
7. CRUD Ideas/Projects проверен на изолированных данных.
8. Публичные metadata и SEO strategy определены и проверены.
9. Проверены мобильный Safari, accessibility и performance.
10. Нет критических ошибок и необъяснённых регрессий.
11. ADR, changelog и rollback plan актуальны.
12. Владелец получил отчёт с доказательствами и сам разрешил следующий этап.

Завершение rewrite не означает автоматический merge в main или deployment.

## 18. Открытые вопросы

До реализации соответствующих частей закрыть:
- фактический hosting/fallback в production;
- возможность SPA rewrites на текущем домене;
- стратегия старых .html ссылок;
- актуальные Supabase Auth redirect allowlist и email templates;
- фактическая production schema/RLS/grants;
- точная функциональная матрица Ideas/Projects;
- требования SEO и индексации;
- необходимость framework/build tool;
- доступность изолированного staging Supabase.

Неизвестное помечать как неизвестное и указывать способ проверки. Не подменять отсутствие данных предположением.

## Приложение A. Правила автономного исполнителя

Исполнитель самостоятельно исследует репозиторий и выбирает обоснованную архитектуру, работает небольшими проверяемыми этапами, сохраняет существующее поведение, проверяет результат и документирует риски.

Исполнитель не меняет main или резервную ветку, не работает в raymondovich.online, не меняет production backend/data/Auth/DNS/Cloudflare/hosting, не добавляет секреты в Git, не удаляет функции без согласования, не публикует и не деплоит результат.

## Приложение B. Источники

- docs/architecture/current-state-2026-11-05.md
- docs/changes/2026-11-05-current-state-snapshot.md
- docs/architecture/target-architecture.md
- docs/architecture/overview.md
- docs/architecture/projects.md
- docs/security/admin-security.md

**Статус:** draft 0.1. Это базовая спецификация для дальнейшей детализации и согласования. Реализацию приложения начинать после функциональной инвентаризации и принятия критичных ADR.
