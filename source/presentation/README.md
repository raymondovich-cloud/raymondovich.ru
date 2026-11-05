<!-- version 1.1 -->
# Presentation

Пользовательский интерфейс, страницы и UI-взаимодействия.

Presentation обращается к Application через публичные use-case contracts. Файлы `source/presentation/runtime/` являются composition root: они связывают application services с infrastructure adapters. Остальные presentation-модули не импортируют Supabase SDK или внутренние infrastructure adapters напрямую.
