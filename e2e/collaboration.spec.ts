import { expect, test, type Page } from "@playwright/test";

async function signInAsInterviewer(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("candidate canvas changes are synchronized to the interviewer", async ({ browser }) => {
  const interviewer = await browser.newContext();
  const candidate = await browser.newContext();
  const interviewerPage = await interviewer.newPage();
  const candidatePage = await candidate.newPage();
  const interviewTitle = `Collaborative interview ${Date.now()}`;

  await signInAsInterviewer(interviewerPage);
  await interviewerPage.getByRole("main").getByRole("link", { name: "New interview" }).click();
  await interviewerPage.getByLabel("Interview title").fill(interviewTitle);
  await interviewerPage.getByLabel("Candidate name or reference").fill("Playwright Candidate");
  await interviewerPage.getByRole("button", { name: "Create interview" }).click();
  await expect(interviewerPage).toHaveURL(/\/lobby\//);

  const joinLink = await interviewerPage.getByLabel("Candidate invitation link").inputValue();
  expect(joinLink).toMatch(/\/join\//);

  await candidatePage.goto(joinLink);
  await candidatePage.getByLabel("Display name").fill("Playwright Candidate");
  await candidatePage.getByRole("button", { name: "Join interview" }).click();
  await expect(candidatePage).toHaveURL(/\/interview\//);

  await interviewerPage.getByRole("link", { name: "Enter interview room" }).click();
  await expect(interviewerPage).toHaveURL(/\/interview\//);

  await candidatePage.getByLabel("Search components").fill("Message queue");
  await candidatePage.getByRole("button", { name: "Message queue" }).click();
  await expect(candidatePage.getByText("Saved", { exact: true })).toBeVisible();

  await expect(
    interviewerPage
      .getByRole("application", { name: "Collaborative system design canvas" })
      .getByText("Message queue", { exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  await candidate.close();
  await interviewer.close();
});
