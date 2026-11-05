# Design System Core

Единая визуальная и компонентная основа Raymondovich.ru.

Здесь размещаются только общие визуальные ресурсы платформы:
- `tokens/` — дизайн-токены, включая motion-токены;
- `foundations/` — базовые визуальные правила, включая доступность и reduced motion;
- `components/` — переиспользуемые UI-компоненты;
- `patterns/` — повторяемые композиции компонентов, включая орбитальное знакомство с системой;
- `layouts/` — общие правила построения интерфейсов.

Design System Core — shared capability, а не пользовательское пространство и не бизнес-модуль.

Закрытый Design System Workspace располагается логически внутри Owner Control Center и использует фактические определения Core. Он не должен содержать независимые копии токенов или компонентов.

Motion Foundation и первый интерактивный паттерн документированы в [Motion System](../../docs/architecture/motion-system.md).

Архитектурные правила: [docs/architecture/design-system.md](../../docs/architecture/design-system.md).

До принятия ADR не добавлять framework-specific код, runtime entrypoints или произвольную CSS-реализацию.
