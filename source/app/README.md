# Application layer

Здесь располагаются bootstrap, composition root, router и layouts.

Router выбирает одно из четырёх пространств. Layout отвечает только за оболочку интерфейса. Bootstrap запускает приложение, composition root связывает реализации зависимостей.

Нельзя помещать сюда бизнес-правила модулей или прямые запросы к Supabase.
