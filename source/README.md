# Source architecture

Исходный код Raymondovich.ru строится как модульный монолит внутри одного SPA.

Четыре пользовательских пространства:
- Public
- Owner Control Center
- Partner Project Management
- External Project Workspace

Общие технические возможности (Identity, Router, Design System, Infrastructure) не являются отдельными пользовательскими пространствами.

Архитектурная спецификация: [platform-architecture.md](../docs/architecture/platform-architecture.md).

Технологический стек и runtime entrypoint не создаются до утверждения соответствующих ADR. Текущий публичный `index.html` не изменяется этим каркасом.
