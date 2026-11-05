import { test, expect } from "@playwright/test";

test("public home renders without an authentication network request", async ({ page }) => {
  const authRequests = [];
  page.on("request", (request) => {
    if (/\.supabase\.co\/auth\//i.test(request.url())) authRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Продукты, которые мы строим/ })).toBeVisible();
  expect(authRequests).toEqual([]);
});

test("products and cooperation routes render when opened directly", async ({ page }) => {
  await page.goto("/#/products");
  await expect(page.getByRole("heading", { name: /Продукты экосистемы/ })).toBeVisible();

  await page.goto("/#/cooperation");
  await expect(page.getByRole("heading", { name: /Три формата развития проектов/ })).toBeVisible();
  await expect(page.getByText("OWN PROJECTS")).toBeVisible();
  await expect(page.getByText("PARTNER PROJECTS")).toBeVisible();
  await expect(page.getByText("EXTERNAL PROJECTS")).toBeVisible();
});

test("legacy products URL preserves query parameters and anchor fragments", async ({ page }) => {
  await page.goto("/pages/products/products.html?campaign=summer#section");

  await expect(page.getByRole("heading", { name: /Продукты экосистемы/ })).toBeVisible();
  await expect.poll(() => page.url()).toContain("campaign=summer");
  await expect.poll(() => page.url()).toContain("#section");
});

test("browser Back restores the previous public route", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "webkit-iphone", "Desktop navigation history is covered in the Chromium project.");

  await page.goto("/");
  await page.getByRole("link", { name: "Продукты экосистемы" }).click();
  await expect(page.getByRole("heading", { name: /Продукты экосистемы/ })).toBeVisible();

  await page.getByRole("link", { name: "Форматы сотрудничества" }).click();
  await expect(page.getByRole("heading", { name: /Три формата развития проектов/ })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: /Продукты экосистемы/ })).toBeVisible();
});

test("mobile WebKit home has no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "webkit-iphone", "Mobile viewport assertion runs in the WebKit iPhone project.");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Продукты, которые мы строим/ })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
