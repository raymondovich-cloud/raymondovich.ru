# Projects — архитектурные границы модулей

> **Проект:** Raymondovich.ru  
> **Документ:** Архитектурные границы Projects  
> **Версия:** 1.0  
> **Статус:** Согласовано для реализации первой вертикали  
> **Дата:** 2026-11-09

## 1. Общая схема

```
Owner Control Center
└── Projects
    ├── Project Registry
    └── Project Workspace
        ├── Project Overview (read-only composition)
        ├── Services Module
        ├── Accounting Module
        ├── Analytics Module
        └── Marketing Module

Application Layer
└── Project Workspace Coordinator
    ├── Projects public contract
    ├── Services public contract
    ├── Accounting public contract
    ├── Analytics public contract
    └── Marketing public contract

Infrastructure
└── Supabase adapters / external API adapters

Design System
└── shared tokens + projects pattern styles

## 2. Владение данными

| Модуль | Первичные данные | Запрещено |
|---|---|---|
| Projects | проекты, статус, приоритет, связь с идеей | владеть операциями Finance или метриками Analytics |
| Services | каталог/ресурсы сервисов и project relations | хранить секреты интеграций |
| Accounting | доходы, расходы, валюты, категории, документы | редактировать первичные Marketing/Analytics данные |
| Analytics | измерения, snapshots, атрибуция и агрегаты | подменять факты источника или редактировать Finance |
| Marketing | площадки, аккаунты, кампании, публикации, синхронизации | хранить секреты и самостоятельно считать бухгалтерский результат |

## 3. Контракты и посредник

Project Overview не обращается напрямую к таблицам каждого модуля. Он вызывает прикладной координатор, который обращается к публичным контрактам модулей и возвращает DTO для отображения.

В первой реализации разрешён модульный монолит и синхронные вызовы интерфейсов в одном приложении. Отдельный брокер или микросервисы не требуются.

Межмодульные команды проходят через Application Layer. События должны иметь версию, project_id, actor context, timestamp и минимальный payload. Чувствительные значения и секреты в события не включаются.

## 4. Изоляция экранов

Каждый модуль имеет собственный route screen, собственный presentation entrypoint и собственный application contract. Общие элементы интерфейса берутся из Design System; бизнес-правила и запросы не выносятся в CSS или общие UI-компоненты.

Первая вертикаль фиксирует следующие точки входа:
- Projects Registry: source/presentation/public/scripts/projects.js + source/application/projects/project-registry.js;
- Project Overview mediator: source/application/projects/project-overview-coordinator.js;
- Services: source/presentation/public/scripts/project-modules/services.js + source/application/services/project-services.js;
- Accounting: source/presentation/public/scripts/project-modules/accounting.js + source/application/accounting/project-accounting.js;
- Analytics: source/presentation/public/scripts/project-modules/analytics.js + source/application/analytics/project-analytics.js;
- Marketing: source/presentation/public/scripts/project-modules/marketing.js + source/application/marketing/project-marketing.js.

Presentation Projects не обращается напрямую к Supabase. Доступ к существующим таблицам инкапсулирован в source/infrastructure/supabase/projects-repository.js. Overview coordinator получает сводки через публичные application contracts модулей. Каждый модуль может развиваться независимо; общий UI не становится владельцем их бизнес-логики.

## 5. Безопасность и доступ

- Первая итерация: admin-only.
- RLS обязателен на каждой таблице в public/exposed schema.
- Любая policy должна проверять одновременно authenticated и владельца/допустимое членство.
- Для UPDATE обязательны корректные USING и WITH CHECK.
- Не использовать user_metadata для ролей.
- Не выдавать service_role/secret keys браузеру.
- После создания таблиц проверить явные GRANT для Data API: новые public tables по актуальной политике Supabase не обязаны автоматически появляться в Data API.
- Partner access вводить только вместе с project membership, granular permissions и тестами изоляции между проектами.

## 6. Границы текущего этапа

Первая вертикаль не создаёт новые финансовые, аналитические или маркетинговые таблицы. Она использует существующую таблицу projects, существующий каталог сервисов/связей, а для остальных блоков показывает честное состояние «Нет данных / модуль готовится». Новые DDL-изменения сначала проверяются на staging.

## История версий

| Версия | Дата | Статус | Изменение |
|---|---|---|---|
| 1.0 | 2026-11-09 | Согласовано | Утверждены владение данными, контракты и посредник, безопасность и границы первой вертикали. |
