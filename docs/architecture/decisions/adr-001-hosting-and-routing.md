# ADR-001: Hosting и маршрутизация SPA

**Статус:** PROPOSED — требуется отдельное утверждение владельцем  
**Дата:** 05.11.2026  
**Рабочая ветка:** `architecture/spa-rewrite-2026-11-05`  
**Область:** только `raymondovich.ru`  
**Связанные документы:**
- `docs/architecture/spa-rewrite-specification.md`
- `docs/architecture/current-state-2026-11-05.md`

## 1. Контекст

Целевая модель Raymondovich.ru — SPA с одной HTML-точкой входа `index.html`, централизованным Router и адресуемыми маршрутами. Спецификация требует History API либо обоснованную библиотеку, прямое открытие маршрутов, refresh, Back/Forward, query/hash, неизвестный маршрут и корректное поведение 404.

По статическому аудиту подтверждено:

- GitHub Pages включён для репозитория; в корне находится `CNAME` со значением `raymondovich.ru`.
- DNS apex и `www` направлены на GitHub Pages; проверенные записи Cloudflare имеют режим DNS only (`proxied: false`).
- Cloudflare Pages project, Worker route и hosting fallback в проверенном состоянии не обнаружены.
- В репозитории нет `404.html`, `_redirects`, конфигурации сборки и deployment workflow.
- Live HTTP-проверка фактических ответов, заголовков, TLS и редиректов не выполнена.

Следовательно, наличие GitHub Pages не подтверждает поддержку clean SPA routes. Текущее поведение прямого запроса к `/owner/projects` остаётся неподтверждённым.

## 2. Обязательные требования

Решение по hosting/routing должно обеспечивать:

1. Один основной HTML entry point — `/index.html`.
2. Чистые URL без обязательного `#` в адресе.
3. Прямое открытие и перезагрузку любого существующего SPA route.
4. Сохранение pathname, query string и hash при загрузке приложения.
5. Back/Forward через History API.
6. Разделение реального отсутствующего статического ресурса и неизвестного SPA route.
7. Клиентский 404 для неизвестного маршрута; серверный HTTP status 404 предпочтителен, если он достижим без дублирования route registry.
8. Совместимость со старыми `.html`-адресами и внешними ссылками через явные redirects/mappings.
9. Сохранение Supabase Auth callback и password recovery flow; новые callback URLs не включать без отдельной проверки Auth allowlist и шаблонов писем.
10. Отсутствие зависимости от неявного поведения конкретного браузера.
11. Возможность отдельного staging deployment и проверки до переключения production.
12. Никаких изменений DNS, Cloudflare, GitHub Pages или production hosting в рамках данного ADR.

## 3. Рассмотренные варианты

### Вариант A — GitHub Pages + Hash Router

Пример URL: `https://raymondovich.ru/#/owner/projects`.

**Преимущества**
- Не требует серверного rewrite/fallback.
- Работает на статическом hosting GitHub Pages.
- Прямой вход и refresh сохраняют клиентский маршрут, поскольку сервер получает корневой pathname.
- Не требует изменения DNS и Cloudflare.

**Недостатки**
- Маршрут находится во fragment, а не в pathname.
- URL-контракт менее чистый и хуже подходит для публичной презентационной платформы.
- Fragment уже может использоваться для якорей и внутренних состояний; потребуется единая политика разделения route и anchor.
- Сложнее формировать canonical URL и поддерживать привычную семантику ссылок.
- Не решает серверную SEO-обработку SPA-контента.

**Вывод:** технически самый простой fallback для сохранения GitHub Pages, но не соответствует предпочтению спецификации к чистым URL.

### Вариант B — GitHub Pages + `404.html` SPA fallback

Идея: добавить `404.html`, которая восстанавливает запрошенный путь и передаёт управление SPA entry point.

**Преимущества**
- Сохраняет GitHub Pages и текущую модель публикации.
- Не требует Worker или переноса hosting.
- Может обеспечить клиентскую загрузку deep link после восстановления исходного URL.

**Недостатки и ограничения**
- GitHub Pages использует `404.html` как страницу ошибки; такой ответ остаётся HTTP 404. Клиентское восстановление маршрута не превращает исходный ответ в полноценный HTTP 200 rewrite.
- Возможны промежуточный redirect/изменение URL и дополнительная логика сериализации pathname, query и hash.
- Реальные 404 для отсутствующих файлов и неизвестных клиентских маршрутов сложнее различать.
- Поисковые роботы и клиенты, не исполняющие JavaScript, могут видеть ошибочный статус или fallback вместо содержимого страницы.
- Это workaround, а не полноценный origin-level rewrite.

**Вывод:** допустимый временный компромисс, если сохранение GitHub Pages обязательно. Не рекомендуется как целевая production-схема для платформы с публичными страницами и закрытыми маршрутами.

### Вариант C — Cloudflare Pages

GitHub остаётся системой хранения исходного кода, Cloudflare Pages становится hosting/deployment target. Для SPA Pages по умолчанию направляет запросы к `index.html`, если в корне опубликованного output нет top-level `404.html`. Router затем определяет маршрут и показывает приложение либо клиентскую страницу 404.

**Преимущества**
- Чистые URL и direct load/refresh поддерживаются штатной SPA-моделью.
- Не требуется самодельный `404.html`-redirect hack.
- Встроенная интеграция с Git repository и отдельными deployment environments.
- CDN и hosting находятся в одной платформе; дальнейшие edge-функции возможны без обязательного внедрения сейчас.
- Позволяет не менять архитектуру приложения при переходе между staging и production.

**Недостатки и ограничения**
- Это смена hosting provider с GitHub Pages на Cloudflare Pages; потребуется отдельная настройка проекта и deployment.
- Потребуется проверить build output directory, build command, environment variables и доступность всех статических ресурсов.
- Текущие DNS-записи и custom domain configuration потребуют отдельного согласованного переключения.
- Если добавить top-level `404.html`, штатное SPA fallback поведение Pages отключится; этот файл нельзя добавлять без осознанной стратегии 404.
- Неизвестный клиентский маршрут по умолчанию может получить HTTP 200 с UI-страницей 404 (soft 404). Это нужно учитывать для SEO и мониторинга.
- Наличие Cloudflare zone само по себе не означает, что Pages project уже создан или подключён.

**Вывод:** наиболее прямой кандидат для чистых SPA routes при сохранении GitHub как source control. Требует отдельного решения и staging-проверки до любого production-переключения.

### Вариант D — GitHub Pages за Cloudflare Worker

Worker принимает запросы и выполняет rewrite/proxy к GitHub Pages, возвращая `index.html` для SPA navigation paths, но отдавая реальные assets напрямую origin.

**Преимущества**
- Можно сохранить GitHub Pages как origin и получить контроль над HTTP routing.
- Worker может различать статические assets, SPA navigation paths, legacy redirects и ошибки.
- Можно централизовать canonical redirects и добавить техническую телеметрию.

**Недостатки и ограничения**
- Для Cloudflare Workers Routes hostname должен быть proxied через Cloudflare. Текущие проверенные DNS-записи имеют DNS-only статус, поэтому Worker route сейчас не может быть просто добавлен без изменения DNS/proxy.
- Появляется дополнительный edge runtime и код, который нужно тестировать, мониторить и поддерживать.
- Нужно корректно реализовать proxy origin, защититься от циклических запросов и не ломать cache/content headers.
- Ошибки Worker могут затронуть весь сайт, включая публичную часть.
- Для этого сценария сложнее операционная модель, чем у Cloudflare Pages.

**Вывод:** гибкий вариант, если принципиально нужно оставить GitHub Pages origin или требуется специальная edge-логика. Для текущих требований избыточен по сравнению с Cloudflare Pages.

### Вариант E — другой hosting с поддержкой rewrites

Например, статический hosting, где явно настраивается rewrite всех app routes на `index.html`.

**Преимущества**
- Clean URLs и HTTP 200 для известных SPA routes могут поддерживаться серверной конфигурацией.
- Можно выбрать платформу по стоимости, SLA, build pipeline и удобству эксплуатации.
- Не привязывает архитектуру приложения к GitHub Pages.

**Недостатки**
- Ещё один hosting provider и отдельная интеграция.
- Потребуется сравнение тарифов, ограничений, логирования, регионов, CI/CD и правил хранения секретов.
- Нет доказанного преимущества перед Cloudflare Pages для текущего проекта.

**Вывод:** оставить как резервный вариант, если Cloudflare Pages не пройдёт технические, коммерческие или эксплуатационные критерии.

## 4. Сравнение

| Критерий | A: Hash + Pages | B: 404 fallback | C: Cloudflare Pages | D: Worker + Pages | E: другой hosting |
|---|---|---|---|---|---|
| Чистые pathname URL | Нет | Да, с workaround | Да | Да | Обычно да |
| Direct load / refresh | Да | Клиентский workaround | Да | Да | При rewrite |
| HTTP 200 для SPA route | Да для корня, не pathname | Нет, исходный 404 | Да для fallback | Можно обеспечить | Зависит от конфигурации |
| Настоящий 404 для неизвестного route | Клиентский | Смешивается с fallback | Клиентский soft 404 по умолчанию | Можно реализовать | Зависит от конфигурации |
| Нужны изменения DNS | Нет | Нет | Да, при подключении домена | Да, proxy обязателен | Да |
| Дополнительный runtime | Нет | Нет | Нет для базового SPA | Worker | Зависит от платформы |
| Сложность эксплуатации | Низкая | Средняя | Средняя | Высокая | Средняя |
| Соответствие целевой спецификации | Частичное | Частичное | Высокое | Высокое | Потенциально высокое |

## 5. Предварительная рекомендация

**Рекомендуемый кандидат для целевой схемы — вариант C: Cloudflare Pages.**

Причины:
- соответствует требованию clean URL и прямой загрузки SPA-маршрутов;
- использует штатное поведение платформы, а не 404 workaround;
- позволяет оставить GitHub основным репозиторием;
- не требует собственного Worker только ради fallback;
- даёт возможность сначала развернуть отдельное тестовое окружение.

Это рекомендация для дальнейшей проверки, а не утверждение о принятом решении. Текущий hosting остаётся GitHub Pages, пока владелец отдельно не утвердит миграцию и её план.

**Резервный вариант:** оставить GitHub Pages и использовать Hash Router, если перенос hosting запрещён или нежелателен. В таком случае нужно отдельно пересмотреть требование clean pathname URL и публичную SEO-стратегию.

Вариант B не рекомендуется как постоянное решение. Вариант D имеет смысл только при появлении конкретных edge-требований, которые Cloudflare Pages не покрывает.

## 6. Требуемая схема после утверждения варианта C

1. GitHub repository остаётся source of truth.
2. Cloudflare Pages получает отдельный проект, связанный с репозиторием.
3. Сборка публикует только production build output; исходный код и секреты не публикуются как assets.
4. Staging deployment проверяется на техническом URL Pages.
5. После отдельного согласования настраивается custom domain и DNS.
6. SPA Router использует History API и централизованный route registry.
7. В output отсутствует top-level `404.html`, если используется default SPA fallback.
8. Router показывает собственный 404 view для неизвестных путей.
9. Реальные отсутствующие assets должны возвращать 404, а не HTML shell.
10. Старые `.html`-адреса обрабатываются отдельной таблицей redirects/compatibility routes.
11. Auth callback и recovery URL остаются неизменными до отдельной проверки Supabase Auth redirect allowlist и тестов.
12. SEO для публичных страниц (metadata, canonical, robots, sitemap, prerender/SSR при необходимости) рассматривается отдельно; SPA fallback сам по себе не гарантирует SEO.

## 7. Обязательные проверки перед production

### Staging / HTTP
- GET `/` и загрузка `index.html`.
- GET каждого согласованного чистого маршрута напрямую.
- Refresh на вложенных маршрутах.
- GET отсутствующего JS/CSS/image/font — настоящий 404.
- GET неизвестного SPA route — отображение приложения с 404 view; зафиксировать фактический HTTP status.
- сохранение query string и hash.
- Back/Forward и последовательные переходы.
- корректная обработка trailing slash, URL encoding и регистра символов.
- MIME types, cache headers, compression, TLS, canonical host redirects.
- отсутствие утечки environment variables и секретов в клиентском bundle.
- корректная загрузка lazy chunks после deployment и поведение при устаревшем кеше.

### Functional / Auth
- публичные маршруты открываются без сессии.
- закрытые маршруты не раскрывают данные без авторизации.
- redirect target не позволяет open redirect.
- login, registration, email confirmation, callback, recovery и password update работают после миграции.
- старые ссылки и Auth email URLs не теряются.
- пользовательские данные и Supabase policies не меняются в рамках hosting-переезда.

### Rollback
- заранее описан возврат DNS/custom domain к предыдущему hosting.
- GitHub Pages остаётся доступным как rollback target до завершения периода стабилизации.
- критерии rollback: массовые 4xx/5xx, нарушение Auth flows, недоступность публичных/закрытых пространств, неверная выдача assets или критические ошибки TLS/DNS.

## 8. Нерешённые вопросы

1. Подтвердить фактический GitHub Pages publishing source и настройки custom domain через доступный read-only интерфейс.
2. Провести live HTTP-проверку текущего production без изменения конфигурации: status, redirects, headers, TLS и поведение нескольких существующих URL.
3. Определить, нужен ли server-side HTTP 404 для неизвестных SPA routes либо допустим клиентский soft 404 с последующей SEO-стратегией.
4. Проверить, доступен ли Cloudflare Pages в желаемом плане и регионе, и оценить build/deployment limits.
5. Определить staging branch/environment и правила promotion в production.
6. Утвердить canonical host: apex или www; сейчас этот ADR не меняет существующий доменный контракт.
7. Отдельно определить legacy URL redirects и Auth callback compatibility.
8. После выбора hosting утвердить Router mode и библиотеку в рамках frontend stack / routing ADR, не смешивая их с бизнес-логикой.

## 9. Решение и ограничения

**Текущий статус:** PROPOSED. Вариант C рекомендован к staging-проверке, но не утверждён для production.

До отдельного разрешения владельца запрещено:
- создавать или изменять Cloudflare Pages project;
- создавать Worker, route, redirect rule или deployment;
- менять DNS records, proxy status, SSL/TLS или GitHub Pages settings;
- менять production hosting или custom domain;
- добавлять fallback/config files в приложение;
- менять Auth redirect URLs;
- начинать SPA implementation.

ADR фиксирует анализ и рекомендуемый путь. Окончательное решение будет внесено в этот документ после проверки и прямого утверждения владельца.

## 10. Источники

- GitHub Docs — [Creating a custom 404 page for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)
- GitHub Docs — [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- Cloudflare Docs — [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- Cloudflare Docs — [Single Page Application on Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- Cloudflare Docs — [Workers Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- Cloudflare Docs — [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
