import { test, expect } from "@playwright/test";

const supabaseOrigin = "https://yajybgdorhxebbigwjgi.supabase.co";
const storageKey = "sb-yajybgdorhxebbigwjgi-auth-token";

async function installSession(page, role = "admin") {
  const now = Math.floor(Date.now() / 1000);
  await page.addInitScript(({ key, currentTime, userRole }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: "e2e-access-token",
      refresh_token: "e2e-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: currentTime + 3600,
      user: {
        id: "e2e-user-0001",
        aud: "authenticated",
        role: "authenticated",
        email: "e2e@example.test",
        app_metadata: { role: userRole },
        user_metadata: { display_name: "E2E User" },
        created_at: new Date(currentTime * 1000).toISOString(),
      },
    }));
  }, { key: storageKey, currentTime: now, userRole: role });
}

async function mockOwnerData(page) {
  await page.route(`${supabaseOrigin}/rest/v1/ideas**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }),
  );
  await page.route(`${supabaseOrigin}/rest/v1/projects**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }),
  );
}

test("unauthenticated visitor cannot enter the Owner Control Center", async ({ page }) => {
  await page.route(`${supabaseOrigin}/**`, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "No active test session" }),
    }),
  );

  await page.goto("/#/owner");
  await expect(page.getByRole("heading", { name: "Войти" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
  await expect(page).toHaveURL(/#\/auth\/login\?redirect=/);
});

test("authenticated non-admin cannot enter the Owner Control Center", async ({ page }) => {
  await installSession(page, "user");
  await page.goto("/#/owner/ideas");

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: /Продукты, которые мы строим/ })).toBeVisible();
});

test("admin can open Owner Control Center and navigate to Ideas", async ({ page }) => {
  await installSession(page, "admin");
  await mockOwnerData(page);

  await page.goto("/#/owner");
  await expect(page.getByRole("heading", { name: "Центр управления" })).toBeVisible();
  await page.getByRole("button", { name: /Идеи/ }).click();
  await expect(page).toHaveURL(/#\/owner\/ideas$/);
  await expect(page.getByRole("heading", { name: "Идеи", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Добавить новую идею" })).toBeVisible();
});

test("login form reports invalid credentials without exposing backend details", async ({ page }) => {
  await page.route(`${supabaseOrigin}/auth/v1/token**`, (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code: "invalid_credentials", message: "Invalid login credentials" }),
    }),
  );

  await page.goto("/#/auth/login");
  await page.getByLabel("Email").fill("wrong@example.test");
  await page.getByLabel("Пароль").fill("incorrect-password");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.locator(".auth-message")).toHaveText("Неверный email или пароль.");
  await expect(page).toHaveURL(/#\/auth\/login$/);
});

test("password reset sends request and displays privacy-preserving confirmation", async ({ page }) => {
  let resetPayload;
  await page.route(`${supabaseOrigin}/auth/v1/recover`, async (route) => {
    resetPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/#/auth/reset-password");
  await page.getByLabel("Email").fill("person@example.test");
  await page.getByRole("button", { name: "Отправить письмо" }).click();

  await expect(page.locator(".auth-message")).toContainText("Если аккаунт с этим email существует");
  expect(resetPayload?.email).toBe("person@example.test");
  expect(resetPayload?.gotrue_meta_security).toBeUndefined();
});

test("registration screen exposes the required name, email and password fields", async ({ page }) => {
  await page.goto("/#/auth/register");

  await expect(page.getByRole("heading", { name: "Создать аккаунт" })).toBeVisible();
  await expect(page.getByLabel("Имя")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
  await expect(page.getByRole("button", { name: "Зарегистрироваться" })).toBeVisible();
});

test("unknown SPA route renders the not-found view", async ({ page }) => {
  await page.goto("/#/missing-e2e-route");

  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(page.getByRole("link", { name: "На главную" })).toBeVisible();
});
