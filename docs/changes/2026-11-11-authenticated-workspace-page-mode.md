# Сохранение полноэкранного режима авторизованного пространства

## Симптом

После открытия вложенного экрана в Ideas или Projects рабочее пространство переставало занимать весь экран и визуально выглядело как карточка внутри публичной страницы. Аналогичный эффект возникал в карточке проекта и его модулях. Сворачивание и повторное открытие Safari временно восстанавливало корректную компоновку.

## Подтверждённая причина

Функция `emitNavigation()` в `source/presentation/public/navigation/navigation.js` при каждом событии навигации безусловно перезаписывала `document.body.dataset.page` значением публичного маршрута: например, `owner-ideas` или `owner-projects`.

При этом авторизованная оболочка уже была смонтирована, а её полноэкранное позиционирование в Design System зависит от селектора:

`body[data-page="authenticated-workspace"] .authenticated-app-shell`

После перезаписи `data-page` этот селектор переставал совпадать. Оболочка теряла `position: fixed` и оказывалась внутри обычной разметки страницы. Это объясняет общий дефект на разных вложенных экранах; проблема не была вызвана отдельными карточками Ideas/Projects и не сводилась к compositing-анимации Safari.

## Исправление

- При событии навигации на маршрут `#authorization` или `#authorization/*` проверяется наличие смонтированной `.authenticated-app-shell`.
- Если оболочка уже существует, сохраняется `body[data-page="authenticated-workspace"]`.
- До монтирования авторизованной оболочки и после выхода на публичный маршрут сохраняется прежнее определение страницы.
- Production, `main`, Supabase и пользовательские данные не изменялись.

## Проверки

- Статически подтверждена связь между условным CSS полноэкранной оболочки и `body[data-page]`.
- Через Cloudflare Browser Rendering проверена опубликованная сборка с реальным `navigation.js` и CSS из Preview. Тестовый DOM shell использовался как fixture без входа в Supabase.
- На viewport 390×844 проверены `idea-detail`, повторный выбор вкладки Ideas, `project-overview`, `project-services`, `project-accounting`, `project-analytics`, `project-marketing` и `project-create`: во всех состояниях `body[data-page]` оставался `authenticated-workspace`, а computed `position` оболочки — `fixed`.
- На viewport 320×740 повторно проверены вложенные экраны Ideas и Accounting: оболочка сохраняет `position: fixed` и ширину viewport.
- После перехода на публичный маршрут `#help` режим корректно меняется на `help`, а оболочка больше не получает полноэкранное позиционирование.
- Это браузерная регрессия на Chromium, а не эмуляция WebKit. Реальная проверка на iPhone Safari остаётся отдельной проверкой устройства.

## Область изменения

Изменён только `source/presentation/public/navigation/navigation.js` в тестовой ветке `ui/prototype-v3-full-parity`. Продолжение работы ведётся в существующем Draft PR #26.
