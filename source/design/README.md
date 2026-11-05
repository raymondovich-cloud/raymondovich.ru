<!-- version 1.1 -->
# Raymondovich Design System

Самостоятельная визуальная система проекта. Design отвечает за визуальные контракты и не содержит бизнес-логики.

## Граница ответственности

- Design owns visual tokens, foundations, reusable visual primitives and layout patterns.
- Presentation owns page composition, route-specific content and user interaction.
- Application owns use cases and business orchestration.
- Domain owns business rules and invariants.
- Infrastructure owns external adapters.

Допустимая зависимость: Presentation consumes Design. Обратные зависимости запрещены.

## Текущая структура

- `tokens.css` — единый источник базовых визуальных токенов, извлечённых из существующего UI.
- `spa.css` — глобальная SPA foundation и shell styles; использует shared tokens.
- `spa-auth.css` — текущие scoped auth styles.
- Остальные CSS-файлы — текущие scoped page/workspace styles, которые постепенно классифицируются и переводятся на shared tokens.

## Правила

1. Не размещать здесь бизнес-логику, проверки ролей, запросы, обработчики бизнес-процессов или работу с данными.
2. Не импортировать Domain, Application или Infrastructure.
3. Не создавать второй источник истины для уже существующего токена.
4. Новые повторно используемые визуальные значения добавлять в `tokens.css`; локальные значения допустимы только для действительно уникального оформления.
5. Не менять существующую визуальную семантику при механическом переходе на токены.
6. Public и Owner пока сохраняют отличающиеся исторические оттенки accent/background. Их визуальное объединение — отдельное дизайн-решение, а не побочный эффект рефакторинга.
7. Компоненты Design должны быть presentation-agnostic: принимать параметры и callbacks, но не принимать бизнес-решения.
8. Page-specific layout/composition остаётся в Presentation; общие визуальные primitives принадлежат Design.
9. Все новые правила должны учитывать keyboard focus, reduced motion, contrast, touch targets и responsive behavior.
10. Пустые каталоги и speculative components не добавлять.

## Этапы развития

1. Инвентаризация и централизация существующих tokens.
2. Foundations: typography, spacing, borders, surfaces, focus and motion rules.
3. Reusable visual components.
4. Layout patterns.
5. Постепенный перевод scoped styles на единые tokens с проверкой визуального паритета.
