# Обновление подготовки SPA к слиянию и сверка утверждённого текста

**Дата:** 05.11.2026  
**Область:** только `raymondovich.ru`, рабочая ветка `architecture/spa-rewrite-2026-11-05`

## Изменения

- Актуализирован `docs/architecture/merge-preparation-status-2026-11-05.md`: удалены устаревшие утверждения о том, что SPA ещё не начата и frontend stack не утверждён; отражены фактическая реализация и оставшиеся блокеры.
- Сверен публичный раздел сотрудничества с утверждёнными владельцем формулировками.
- В `source/presentation/spa/views/public/Cooperation.vue` восстановлен утверждённый блок: метка «01 / НАПРАВЛЕНИЯ», заголовок «Три формата развития проектов», три названия и точные описания:
  - OWN PROJECTS / «Собственные проекты» — «Продукты и цифровые решения, которые мы самостоятельно разрабатываем и развиваем.»
  - PARTNER PROJECTS / «Партнёрские проекты» — «Направления, к которым можно присоединиться, чтобы совместно создавать, развивать и продвигать продукты.»
  - EXTERNAL PROJECTS / «Сторонние проекты» — «Разработки независимых авторов, которые могут стать частью экосистемы после рассмотрения и согласования условий сотрудничества.»
- Удалён дополнительный вводный абзац: в согласованном блоке остаются только метка, заголовок и три описания.
- В legacy URL handoff перенесены query-параметры внутрь hash-route, чтобы старые URL авторизации сохраняли параметр redirect и другие route query-параметры.
- Исправлено устаревшее описание модели данных в `docs/architecture/overview.md`: теперь отражены отдельные `public.ideas` и `public.projects`, `source_idea_id` и неатомарная компенсационная последовательность.
- Проверено, что privacy, terms и cookies в исходном `main` уже имели статус «В разработке»; фиктивный юридический текст не добавлялся.


- В статусном документе синхронизированы точные три описания с исходным сообщением владельца от 05.11.2026; короткие пересказы не используются.

- Auth callback теперь обеспечивает создание/обновление `user_profiles` после подтверждения email; callback redirect выбирает `/owner` только для `app_metadata.role=admin`, обычный пользователь возвращается на публичную главную.
- Разделы Owner Control Center получили стабильные маршруты `/owner`, `/owner/ideas`, `/owner/projects`; переключение представлений синхронизировано с Vue Router и Back/Forward. Добавлен архитектурный тест маршрутов и URL-state.

- Исторические `functional-inventory-and-migration-matrix` и `deep-functional-and-data-migration-map` явно помечены как baseline-снимки до SPA-миграции; актуальный статус вынесен в merge-preparation status.
- `final-repository-structure.md` синхронизирован с фактическим прогрессом и действующим разрешением на работу в migration branch; production/merge ограничения сохранены.

- `docs/architecture/overview.md` обновлён до version 1.2 после исправления описания модели данных.


- Обновлены merge status, ADR-004 и final integration audit: CI run `42105782576`, checkout SHA `9fd037c900d5c9e2e371ec6783c4e176a622cd9a`, 56 tests passed, build и smoke checks прошли.

- Project launch стал идемпотентным при конкурентной вставке: при PostgreSQL unique violation (`23505`) сервис повторно читает связанный проект и синхронизирует идею, не создавая дубль.
- Ошибка после успешного удаления проекта теперь явно сообщает о частичном успехе, если восстановление исходной идеи завершилось ошибкой; добавлен unit test этого сценария.

- CI jobs дополнительно ограничены условием точной migration branch; даже ручной `workflow_dispatch` на `main` не выполнит lockfile write или build job.

- Восстановлены четыре отсутствовавших migration files по версиям live history и выровнен timestamp migration расширения projects. Восстановление сделано только в рабочей ветке; byte-for-byte identity исходного SQL не подтверждена, требуется clean isolated staging replay. Production migrations не запускались.

- Сохранён исходный SQL seed migration `20261009132738` (включая оба проекта `.ru` и `.online`) и исходная транзакционная граница `BEGIN/COMMIT` migration `20261104185802`; альтернативные branch-only варианты с семантическим дрейфом отклонены.

- Добавлен `tests/architecture/migration-contracts.test.js`: проверяет 14-версионный migration inventory, запрет доступа к temporary admin function для `PUBLIC/anon/authenticated`, RLS/grants для projects, оба seeded проекта, транзакционную границу planning migration и отсутствие destructive `DROP TABLE`/`TRUNCATE`.

- Read-only Supabase audit подтвердил, что все 14 migration files совпадают с сохранёнными live `schema_migrations.statements` (0 SQL differences). Clean local Supabase replay и RLS integration tests остаются отдельным quality gate; production не менялся.

- Обновлён `docs/security/admin-security.md` до version 1.4: устранено устаревшее утверждение об отсутствующих миграциях; зафиксировано 0 SQL statement differences между 14 repo migrations и live ledger, при сохранении требования clean isolated replay.

- Добавлен Playwright 1.64.1 и E2E-контур Chromium + WebKit iPhone emulation: публичные маршруты, утверждённые тексты направлений, legacy URL redirect, owner auth guard, 404, robots/sitemap и мобильный horizontal overflow. CI устанавливает browser engines и запускает `npm run test:e2e`; реальный iOS Safari и живой Supabase Auth остаются отдельными проверками.

## Проверки и ограничения

- Изменённые файлы повторно получены из GitHub после записи.
- Успешные workflow runs на промежуточных SHA существуют, но они не заменяют успешный CI на последнем commit после всех последующих изменений.
- Merge не выполнялся. Production, `main`, backup branch и `raymondovich.online` не затрагивались.
