<!-- version 1.1 -->

# Модель данных раздела «Инструменты»

**Дата:** 09.10.2026  
**Статус:** Базовая схема применена в Supabase; UI подключён к таблицам, проверка продолжается.

## 1. Что уже существует

В текущем Supabase-проекте raymondovich обнаружены таблицы:

- public.projects — проекты, первичный ключ id типа uuid, владелец owner_id с внешним ключом на auth.users.id.
- public.project_milestones — этапы проектов.
- public.project_tasks — задачи этапов.
- public.project_history — история проектов.
- public.user_profiles — профиль пользователя.

RLS включён на перечисленных таблицах. Политики проектов используют роль admin из app_metadata и проверку владельца через auth.uid(). Новая модель должна соответствовать этому принципу и не менять существующие таблицы проектов без необходимости.

## 2. Предлагаемые таблицы

### 2.1. public.ecosystem_tools

Реестр сервисов и платформ.

- id uuid primary key, default gen_random_uuid().
- owner_id uuid not null, references auth.users(id).
- name text not null.
- slug text not null.
- category text not null.
- description text not null default ''.
- official_url text null.
- status text not null, допустимые значения: active, testing, paused, retired.
- last_verified_at timestamptz null.
- created_at timestamptz not null default now().
- updated_at timestamptz not null default now().

Ограничения: уникальность slug в пределах owner_id; name не пустой; category и status ограничены согласованными значениями или проверяемым справочником. URL должен быть обычной ссылкой без секретов и токенов.

### 2.2. public.tool_resources

Конкретные объекты, управляемые сервисами: репозитории, домены, базы данных, серверы, API и deployment-ресурсы.

- id uuid primary key, default gen_random_uuid().
- owner_id uuid not null, references auth.users(id).
- tool_id uuid not null, references public.ecosystem_tools(id).
- name text not null.
- resource_type text not null.
- resource_url text null.
- external_id text null.
- environment text null: production, staging, development или null.
- status text not null: active, testing, paused, retired, unknown.
- description text not null default ''.
- last_verified_at timestamptz null.
- created_at timestamptz not null default now().
- updated_at timestamptz not null default now().

Идентификаторы, URL и названия ресурсов не должны включать секретные токены, пароли или приватные ключи. Внешний ID добавляется только если нужен и безопасен для хранения.

### 2.3. public.project_tool_relations

Связи между проектами и сервисами, когда инструмент используется в проекте независимо от конкретного ресурса.

- id uuid primary key, default gen_random_uuid().
- owner_id uuid not null, references auth.users(id).
- project_id uuid not null, references public.projects(id) on delete cascade.
- tool_id uuid not null, references public.ecosystem_tools(id) on delete cascade.
- relationship_type text not null: manual_use, technical_integration, infrastructure_dependency, other.
- purpose text not null default ''.
- status text not null: planned, active, paused, retired, needs_verification.
- evidence_note text not null default ''.
- last_verified_at timestamptz null.
- created_at timestamptz not null default now().
- updated_at timestamptz not null default now().

Рекомендуемое ограничение уникальности: project_id + tool_id + relationship_type. Внешние ключи сами по себе не заменяют RLS-проверку владения связанными записями.

### 2.4. public.project_resource_relations

Связи между проектами и конкретными ресурсами. Нужны, поскольку один ресурс может обслуживать несколько проектов, а у одного проекта может быть много ресурсов.

- id uuid primary key, default gen_random_uuid().
- owner_id uuid not null, references auth.users(id).
- project_id uuid not null, references public.projects(id) on delete cascade.
- resource_id uuid not null, references public.tool_resources(id) on delete cascade.
- role text not null default '' — роль ресурса в проекте.
- status text not null: planned, active, paused, retired, needs_verification.
- evidence_note text not null default ''.
- last_verified_at timestamptz null.
- created_at timestamptz not null default now().
- updated_at timestamptz not null default now().

Рекомендуемое ограничение уникальности: project_id + resource_id. Перед вставкой и изменением нужно гарантировать, что проект, ресурс, сервис ресурса и owner_id принадлежат одному владельцу.

## 3. Связи

- ecosystem_tools 1 → N tool_resources.
- projects N ↔ N ecosystem_tools через project_tool_relations.
- projects N ↔ N tool_resources через project_resource_relations.
- Каждая tool_resource относится ровно к одному зарегистрированному сервису.
- У проекта могут быть связи как с сервисом в целом, так и с конкретным ресурсом внутри сервиса.

Пример модели:
- GitHub — запись ecosystem_tools.
- Репозиторий raymondovich.ru — запись tool_resources с tool_id на GitHub.
- Raymondovich.ru — запись в projects.
- Связь проекта с репозиторием — запись project_resource_relations.

Этот пример описывает форму данных, а не подтверждает автоматически фактические конфигурации.

## 4. RLS и права доступа

Для всех четырёх новых таблиц:

- Включить RLS.
- Разрешить доступ только authenticated-пользователю с ролью admin в app_metadata и совпадающим owner_id = auth.uid().
- Для INSERT использовать WITH CHECK.
- Для UPDATE проверять и USING, и WITH CHECK.
- Для DELETE проверять владельца и роль.
- Для связующих таблиц проверять владение проектом и всеми связанными инструментами/ресурсами. Нельзя разрешать ссылку на чужую запись только потому, что пользователь владеет строкой связи.
- Не выдавать anon доступ.
- Не использовать user_metadata для авторизации.
- Не помещать service_role или другие секретные ключи в клиентский код.

До применения миграции нужно проверить фактические GRANT, текущие политики и стратегию внешних ключей. Проверить, что каскадное удаление связей не удаляет проекты, инструменты или ресурсы неожиданным образом.

## 5. Индексы и ограничения

Предусмотреть индексы на:

- ecosystem_tools(owner_id, status), ecosystem_tools(owner_id, category), ecosystem_tools(owner_id, slug).
- tool_resources(owner_id, tool_id), tool_resources(owner_id, resource_type), tool_resources(owner_id, status).
- project_tool_relations(owner_id, project_id), project_tool_relations(owner_id, tool_id).
- project_resource_relations(owner_id, project_id), project_resource_relations(owner_id, resource_id).

Часть индексов может уже создаваться ограничениями UNIQUE. Перед миграцией проверить отсутствие дублирующих индексов. Текстовые статусы ограничить CHECK или отдельными справочниками; не допускать произвольных значений, незаметно ломающих фильтрацию.

## 6. Единый application-контракт

UI и будущий AI Business Analyst не должны строить запросы к таблицам независимо друг от друга. Предусмотреть общий application-сервис с операциями:

- список инструментов с фильтрами по категории и статусу;
- карточка инструмента с ресурсами и связями с проектами;
- карточка ресурса с родительским инструментом и связанными проектами;
- инструменты и ресурсы конкретного проекта;
- список непроверенных, устаревших или не связанных с проектами записей.

Контракт должен возвращать статус и дату проверки вместе с данными. На первом этапе AI Business Analyst использует только read-only операции. Проверка доступа выполняется сервером и/или RLS, а не только клиентским интерфейсом.

## 7. Что требуется решить перед миграцией

1. Подтвердить названия и состав четырёх таблиц.
2. Утвердить допустимые категории, типы ресурсов и статусы.
3. Проверить, что текущая таблица projects предназначена для всех сущностей, которые пользователь считает продуктами/проектами. Если домены и репозитории должны связываться с продуктом, использовать существующий projects.id, не создавать второй каталог проектов.
4. Уточнить, нужны ли поля для ответственного лица, стоимости подписки и даты продления. Не добавлять их «на всякий случай» без подтверждения необходимости.
5. Подготовить SQL-миграцию, политики, ограничения и тесты; применить только после проверки проекта миграции.

**Важно:** документ задаёт предлагаемую модель. Он не является подтверждением того, что таблицы созданы, RLS применён или пользовательские данные уже внесены.


## 5. Реализованная схема — 09.10.2026

Миграции, применённые в Supabase-проекте Raymondovich:

- `20261009132459_create_ecosystem_tools_registry` — четыре таблицы, ограничения, индексы, RLS-политики и триггеры обновления времени.
- `20261009132738_seed_ecosystem_tools_initial_inventory` — начальные записи сервисов, ресурсов и связей.
- `20261009133334_restrict_ecosystem_tools_grants` — явные минимальные grants для четырёх таблиц и дополнительные индексы внешних ключей.

Текущие подтверждённые количества: 4 сервиса, 7 ресурсов, 11 связей проект–сервис, 7 связей проект–ресурс и 4 проекта в реестре проектов. Данные, которые не удалось независимо перепроверить (в частности текущее состояние DNS), помечены как `needs_verification`.

Для новых таблиц RLS включён. Анонимная роль не имеет SELECT grant; authenticated имеет только SELECT/INSERT/UPDATE/DELETE, а фактические строки и операции ограничиваются RLS ролью `app_metadata.role = admin`, owner_id и проверкой владельца связанного проекта/ресурса. `TRUNCATE`, `TRIGGER` и `REFERENCES` для клиентской роли не предоставлены.

Важно: наличие этих политик подтверждено метаданными PostgreSQL; полноценный негативный тест через реальную сессию пользователя без admin-роли ещё нужно выполнить в браузере/API.
