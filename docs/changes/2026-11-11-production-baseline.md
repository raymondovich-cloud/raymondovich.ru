# 2026-11-11 — Фиксация Production baseline

## Зафиксированная контрольная точка

- Application commit: `794b2f678c1f4c69874ef11d3e3adbdf33d08061`.
- Tree SHA: `140a3ed1d5a8dbdfbd35947f402696d2b2537db7`.
- PR #26 объединён в `main`.
- Cloudflare Pages project: `raymondovich-stage2-preview`.
- Production deployment: `00c129bd-8e1c-40f7-bb03-4a151e008eb0`.
- Deployment commit совпадает с application baseline; build и deploy stages завершились успешно.
- Production deployment URL: https://00c129bd.raymondovich-stage2-preview.pages.dev.

## Изменение Cloudflare

По отдельному согласованию владельца включена настройка `production_deployments_enabled=true`. Значение повторно проверено через API. Production branch осталась `main`; остальные source-control настройки сохранены.

## Содержимое baseline

Создан документ `docs/baseline/2026-11-11.md`, который фиксирует application commit и tree SHA, состав PR #26, статус PIN, Cloudflare production deployment, границы выполненных и невыполненных проверок, а также правила дальнейшей работы.

## Ограничения

Успешный Cloudflare build/deploy не равен полной функциональной приёмке. Реальный iPhone Safari/WebKit, Telegram WebView, production Supabase Auth/RLS и end-to-end пользовательские сценарии не проверялись в рамках этой фиксации.

## Не затронуто

Supabase, DNS, Edge Functions, RLS, Auth, пользовательские данные и секреты не изменялись.
