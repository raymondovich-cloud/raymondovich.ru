<!-- version 1.1 -->
# Application

Сценарии приложения и orchestration между Domain и внешними зависимостями.

- Application реализует use cases и зависит от портов/контрактов, а не от Supabase SDK или DOM.
- Репозитории передаются use cases через dependency injection.
- Composition root находится в `source/presentation/runtime/` и связывает application services с infrastructure adapters.
- Application не импортирует Presentation или Infrastructure.
