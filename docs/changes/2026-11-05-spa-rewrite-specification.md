# Черновая спецификация архитектурной переработки SPA

**Дата:** 05.11.2026  
**Ветка:** architecture/spa-rewrite-2026-11-05  
**Базовый commit:** 89cf01f7e70a2a421fbe9e431ddf4d1a3644b9a4

Добавлен рабочий документ docs/architecture/spa-rewrite-specification.md.

Документ определяет:
- цель перехода MPA → SPA и требования к Router;
- ограничения по веткам, production и сохранению функциональности;
- минимальную карту миграции существующих HTML-точек входа;
- требования к URL, hosting fallback, SEO и Supabase Auth;
- границы Clean Architecture, Supabase adapters и Design System;
- тестирование, безопасность, этапы и критерии приёмки;
- запрет на merge/deploy без прямого разрешения владельца.

**Статус:** draft 0.1. Реализация приложения в рамках этой записи не выполнялась.
