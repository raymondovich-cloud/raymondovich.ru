# Синхронизация npm lockfile

**Дата:** 05.11.2026  
**Ветка:** `architecture/spa-rewrite-2026-11-05`

- Синхронизированы root dependency/devDependency/engines metadata в `package-lock.json` с точными значениями `package.json`.
- Зафиксированные версии и разрешённые package entries не менялись.
- Изменение выполнено только в рабочей ветке; production deployment не запускался.
- Проверка воспроизводимой установки выполняется CI через `npm ci`.
