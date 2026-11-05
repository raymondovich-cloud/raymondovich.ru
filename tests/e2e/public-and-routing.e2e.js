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
  await expect(page).toHaveURL(/#\/pages\/products\/products\.html/);
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
