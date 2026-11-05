# Design System — первичная токенизация

## Выполнено
- Создан `source/design/tokens.css` как единый источник базовых визуальных токенов, извлечённых из действующего оформления.
- Сохранены различия существующих Public и Owner палитр. Цвета не унифицировались и визуальное направление не переосмыслялось.
- Подключены tokens на SPA composition root до глобальных и scoped styles.
- Переведены на shared tokens базовые значения SPA shell, Public, Products, Cooperation, Profile, Settings и Owner styles.
- Auth styles частично переведены на общие Owner background/accent, системную типографику и радиус панели.
- Обновлён `source/design/README.md`: закреплены границы самостоятельной Design System и правила зависимости.
- Расширен architecture boundary test: Design System не должен импортировать Domain, Application, Infrastructure, Supabase, Presentation runtime или UI framework; проверяется наличие базовых tokens.

## Подтверждённые файлы после повторного fetch
- `source/design/README.md` — `1daab937fa7aef6297cc90fc014e965f6ea3c724`
- `source/design/tokens.css` — `972c063f38c375865523bdb5cb02d0d2a10082cb`
- `source/presentation/spa/main.js` — `fad312bdc4f85cf137ebb8c60d61a63201690535`
- `source/design/spa.css` — `a65e4ef729a3412158ef45835a0b2c3351a56730`
- `source/design/spa-auth.css` — `a196c9ae528b2f818837c9e66a33d564683c1337`
- `source/design/public.css` — `ce374d4bdea623a67c4cbe3e7079bed8a83ad226`
- `source/design/products.css` — `6018961c78cdf31812c981a31f4d0cbc9231b46a`
- `source/design/cooperation.css` — `762b0ae1ce9f40c5fb2e1d6674d9e194b8e94f47`
- `source/design/profile.css` — `85b281895896cb6aa9a7da4e9f4e53e7495d6dc6`
- `source/design/settings.css` — `78db09ae63ab75808013328294acf8594a794e2a`
- `source/design/owner.css` — `ab985c1d9f6d03847bf1f9e61fde5f9aa58a9b0c`
- `tests/architecture/dependency-boundaries.test.js` — `d9fe23289f5958436bf00787eb4ddbfea31697c5`

## Не завершено
- `about.css` и `legal.css` ещё содержат самостоятельные legacy values.
- Уникальные Auth surface/border/text values пока оставлены локальными.
- Reusable visual components и общие layout patterns ещё не выделялись.
- Полный граф импортов модулей и визуальный parity audit остаются следующими этапами.

## Проверка
- Каждый изменённый файл повторно получен из GitHub; содержимое сверено после записи.
- В ходе переноса `spa.css` была обнаружена и сразу устранена первоначальная непреднамеренная перезапись части layout rules. Финальная версия сверена построчно с исходной: изменены только ссылки на общие tokens, структура и правила layout сохранены.
- Unit tests, build и browser E2E не запускались; визуальный результат не сертифицирован.

## Границы
- Изменения только в `rebuild/foundation-2026-11-06`.
- `main`, backup branches, PR #3, production, Supabase, DNS, Cloudflare, hosting и `raymondovich.online` не изменялись.

## Следующий этап
Завершить перенос оставшихся повторяемых legacy tokens, затем спроектировать первые framework-independent visual primitives и общий Public navigation/layout contract.
