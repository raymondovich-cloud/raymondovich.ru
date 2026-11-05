# Изменения — 05.11.2026

## Утверждение frontend baseline для Raymondovich.ru

По прямому подтверждению владельца утверждены:
- Vue 3 как UI framework для Presentation;
- Vue Router 5 как единый Router SPA;
- Vite 8.x как build tool для Vue SPA и подготовки статических файлов для временного GitHub Pages hosting.

Ограничения и границы решения:
- TypeScript не утверждён; JavaScript ES modules остаются допустимыми.
- Pinia/state manager остаётся отдельным решением ADR-003.
- Domain и Application должны оставаться независимыми от Vue.
- Для временной тестовой среды сохраняется GitHub Pages + Hash Router.
- Production hosting, DNS, Supabase/Auth, backend и deployment не меняются.
- Merge в main и production deployment этим решением не разрешены.

## Проверка

- ADR-002 обновлён в ветке `architecture/spa-rewrite-2026-11-05`.
- Выполнен fetch-back; новый SHA подтверждён.
- На этом шаге изменена только архитектурная документация; прикладной код ещё не мигрирован.
