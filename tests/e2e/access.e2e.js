import { test, expect } from "@playwright/test";

test("unauthenticated visitor cannot enter the Owner Control Center", async ({ page }) => {
  await page.goto("/#/owner");

  await expect(page.getByRole("heading", { name: "Войти" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
  await expect(page).toHaveURL(/#\/auth\/login\?redirect=/);
});

test("unknown SPA route renders the not-found view", async ({ page }) => {
  await page.goto("/#/missing-e2e-route");

  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(page.getByRole("link", { name: "На главную" })).toBeVisible();
});
