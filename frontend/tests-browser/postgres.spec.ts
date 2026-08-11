import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("loads seeded interview records from PostgreSQL", async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole("heading", { name: "Interviews" })).toBeVisible();
  await expect(page.getByText("Active URL Shortener Interview", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed Architecture Review", { exact: true })).toBeVisible();
});

test("creates an interview and reads it back in a fresh browser session", async ({ browser }) => {
  const title = `Postgres browser test ${Date.now()}`;
  const firstContext = await browser.newContext();
  const page = await firstContext.newPage();
  await signIn(page);

  await page.getByRole("main").getByRole("link", { name: "New interview" }).click();
  await page.getByLabel("Interview title").fill(title);
  await page.getByLabel("Candidate name or reference").fill("postgres-e2e");
  await page.getByRole("button", { name: "Create interview" }).click();
  await expect(page).toHaveURL(/\/lobby\//);
  await firstContext.close();

  const secondContext = await browser.newContext();
  const freshPage = await secondContext.newPage();
  await signIn(freshPage);
  await freshPage.getByLabel("Filter interviews").fill(title);
  await expect(freshPage.getByText(title, { exact: true })).toBeVisible();
  await expect(freshPage.getByText("postgres-e2e", { exact: true })).toBeVisible();
  await secondContext.close();
});
