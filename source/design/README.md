# Design System Core

Единая визуальная и компонентная основа Raymondovich.ru.

Здесь размещаются только общие визуальные ресурсы платформы:
- `tokens/` — дизайн-токены;
- `foundations/` — базовые визуальные правила;
- `components/` — переиспользуемые UI-компоненты;
- `patterns/` — повторяемые композиции компонентов;
- `layouts/` — общие правила построения интерфейсов.

Design System Core — shared capability, а не пользовательское пространство и не бизнес-модуль.

Закрытый Design System Workspace располагается логически внутри Owner Control Center и использует фактические определения Core. Он не должен содержать независимые копии токенов или компонентов.

Архитектурные правила: [docs/architecture/design-system.md](../../docs/architecture/design-system.md).

До принятия ADR не добавлять framework-specific код, runtime entrypoints или произвольную CSS-реализацию.
