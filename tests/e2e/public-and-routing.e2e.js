import { test, expect } from "@playwright/test";

test("public root renders without runtime errors or Supabase requests", async ({ page }) => {
  const pageErrors = [];
  const supabaseRequests = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith(".supabase.co")) supabaseRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page).toHaveTitle(/RAYMONDOVICH/i);
  await expect(page.locator("body")).toContainText("RAYMONDOVICH");
  expect(pageErrors).toEqual([]);
  expect(supabaseRequests).toEqual([]);
});

test("products route renders directly", async ({ page }) => {
  await page.goto("/#/products");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Продукты");
  await expect(page.locator("body")).toContainText("Каталог / Направления");
});

test("cooperation route retains the approved three project directions", async ({ page }) => {
  await page.goto("/#/cooperation");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Три формата развития проектов");
  await expect(page.locator("body")).toContainText("Продукты и цифровые решения, которые мы самостоятельно разрабатываем и развиваем.");
  await expect(page.locator("body")).toContainText("Направления, к которым можно присоединиться, чтобы совместно создавать, развивать и продвигать продукты.");
  await expect(page.locator("body")).toContainText("Разработки независимых авторов, которые могут стать частью экосистемы после рассмотрения и согласования условий сотрудничества.");
});

test("about route renders directly", async ({ page }) => {
  await page.goto("/#/about");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Не просто идеи");
  await expect(page.locator("body")).toContainText("Честный статус");
});

test("legacy products URL redirects into its SPA route", async ({ page }) => {
  await page.goto("/pages/products/products.html");
  await expect(page).toHaveURL(/#\/(?:pages\/products\/products\.html|products)/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Продукты");
});

test("legacy products URL preserves query parameters and anchor fragments", async ({ page }) => {
  await page.goto("/pages/products/products.html?campaign=summer#section");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Продукты");
  await expect.poll(() => page.url()).toContain("campaign=summer");
  await expect.poll(() => page.url()).toContain("#section");
});

test("browser Back restores the previous public route", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "webkit-iphone", "Desktop navigation history is covered in the Chromium project.");

  await page.goto("/");
  await page.getByRole("link", { name: "Продукты экосистемы" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Продукты");
  await page.getByRole("link", { name: "Форматы сотрудничества" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Три формата развития проектов");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Продукты");
});

test("unauthenticated owner deep link redirects to login", async ({ page }) => {
  await page.route("https://yajybgdorhxebbigwjgi.supabase.co/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "No active test session" }),
    }),
  );

  await page.goto("/#/owner/ideas");
  await expect(page).toHaveURL(/#\/auth\/login/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Войти");
});

test("unknown route renders the not-found view", async ({ page }) => {
  await page.goto("/#/route-that-does-not-exist");
  await expect(page.locator("body")).toContainText("Страница не найдена");
});

test("crawler policy and sitemap are served by the built application", async ({ request }) => {
  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.ok()).toBeTruthy();
  expect(await robotsResponse.text()).toContain("User-agent: *");

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBeTruthy();
  expect(await sitemapResponse.text()).toContain("<loc>https://raymondovich.ru/</loc>");
});

test("mobile WebKit public root has no horizontal page overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "webkit-iphone", "Mobile viewport check runs in the WebKit iPhone project.");

  await page.goto("/");
  const viewport = page.viewportSize();
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewport.width);
});

const supabaseOrigin = "https://yajybgdorhxebbigwjgi.supabase.co";
const storageKey = "sb-yajybgdorhxebbigwjgi-auth-token";

async function installSession(page, role = "admin") {
  const now = Math.floor(Date.now() / 1000);
  const userId = "00000000-0000-4000-8000-000000000001";
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      aud: "authenticated",
      exp: now + 3600,
      iat: now,
      iss: `${supabaseOrigin}/auth/v1`,
      sub: userId,
      email: "e2e@example.test",
      app_metadata: { provider: "email", providers: ["email"], role },
      user_metadata: { display_name: "E2E User" },
      role: "authenticated",
    }),
    "e2e-signature",
  ].join(".");

  await page.addInitScript(({ key, currentTime, userRole, token, id }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: token,
      refresh_token: "e2e-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: currentTime + 3600,
      user: {
        id,
        aud: "authenticated",
        role: "authenticated",
        email: "e2e@example.test",
        app_metadata: { provider: "email", providers: ["email"], role: userRole },
        user_metadata: { display_name: "E2E User" },
        created_at: new Date(currentTime * 1000).toISOString(),
      },
    }));
  }, { key: storageKey, currentTime: now, userRole: role, token: accessToken, id: userId });
}

async function mockOwnerData(page) {
  await page.route(`${supabaseOrigin}/rest/v1/ideas**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }),
  );
  await page.route(`${supabaseOrigin}/rest/v1/projects**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }),
  );
}

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
  await page.route(`${supabaseOrigin}/auth/v1/recover**`, async (route) => {
    resetPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/#/auth/reset-password");
  await page.getByLabel("Email").fill("person@example.test");
  await page.getByRole("button", { name: "Отправить письмо" }).click();

  await expect(page.locator(".auth-message")).toContainText("Если аккаунт с этим email существует");
  expect(resetPayload?.email).toBe("person@example.test");
});

test("registration screen exposes the required name, email and password fields", async ({ page }) => {
  await page.goto("/#/auth/register");

  await expect(page.getByRole("heading", { name: "Создать аккаунт" })).toBeVisible();
  await expect(page.getByLabel("Имя")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
  await expect(page.getByRole("button", { name: "Зарегистрироваться" })).toBeVisible();
});
