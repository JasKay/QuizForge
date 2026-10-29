import { test, expect } from "./preview";
import { questions } from "../lib/questions";
import { questionStem } from "../lib/choices";
test("guest Play feeds Mastery and category recommendations lead back to Learn", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mastery");
  await expect(
    page.getByRole("heading", { name: "Your power." }),
  ).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(4);
  await expect(
    page.getByText("Your first answer starts the story."),
  ).toBeVisible();
  await page.goto("/practice?mode=category&subject=Science");
  await expect(page.locator(".solo-question h1")).toBeVisible();
  const stem = await page.locator(".solo-question h1").innerText();
  const q = questions.find((q) => questionStem(q.text) === stem)!;
  expect(q.subject).toBe("Science");
  await page.getByRole("button", { name: q.answer, exact: true }).click();
  await expect(page.locator(".solo-feedback")).toContainText("Correct");
  await page.goto("/mastery");
  await expect(page.locator(".ms-summary")).toContainText(
    String({ Easy: 10, Medium: 20, Hard: 40 }[q.difficulty]),
  );
  const science = page
    .locator(".ms-domain")
    .filter({ hasText: "Science" })
    .filter({ hasText: "1 explored" });
  await expect(science).toContainText("100% accuracy");
  await science.click();
  await expect(page.locator(".ms-detail h2")).toHaveText("Science");
  await page.getByRole("link", { name: "Learn this domain" }).click();
  await expect(page.locator(".tr-topic-pill")).toHaveText("Science");
  await expect(page.locator(".ms-nudge")).toContainText("Science");
  await page.goto("/mastery");
  await page.screenshot({ path: "artifacts/mastery-mobile.png" });
  await page.setViewportSize({ width: 320, height: 568 });
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const link of await nav.getByRole("link").all())
    await expect(link).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("team shows university, shared goal, strengths and encouragement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      json: {
        user: { id: "me", name: "Jordan", email: "j@example.com" },
        session: { id: "session", userId: "me", expiresAt: "2099-01-01" },
      },
    }),
  );
  let cheered = false;
  await page.route("**/api/teams", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({
        action: "cheer",
        userId: "friend",
      });
      cheered = true;
      await route.fulfill({ json: { ok: true } });
      return;
    }
    await route.fulfill({
      json: {
        team: {
          id: "t",
          name: "Campus Thinkers",
          school: "Howard University",
          owner_id: "me",
          room_code: null,
          invite_code: "ABCDEFGHIJKL",
          stats: { xp: 240, learned: 12, active: 2 },
          weekly: { answers: 14, goal: 50 },
          members: [
            {
              id: "me",
              name: "Jordan",
              xp: 100,
              strongest: "Science",
              power: 12,
              focus: "History",
            },
            {
              id: "friend",
              name: "Sam",
              xp: 140,
              strongest: "Literature",
              power: 18,
              focus: "Geography",
              cheers: cheered ? 1 : 0,
              cheered,
            },
          ],
        },
        available: [],
        challenges: [
          {
            id: "c",
            from_team: "t",
            to_team: "u",
            from_name: "Campus Thinkers",
            to_name: "The Scholars",
            from_school: "Howard University",
            to_school: "Hampton University",
            scheduled_at: "2026-11-01T17:00:00Z",
            status: "accepted",
            room_code: "ABCD1234",
          },
        ],
      },
    });
  });
  await page.goto("/teams");
  await expect(
    page.getByText("Howard University", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "14 / 50 connections" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "People" }).click();
  await expect(page.getByText("Literature · 18 power")).toBeVisible();
  await page.getByRole("button", { name: "Cheer for Sam" }).click();
  await expect(
    page.getByRole("button", { name: "Cheer for Sam" }),
  ).toBeDisabled();
  await expect(page.getByText("1 cheers today")).toBeVisible();
  await page.getByRole("tab", { name: /Matches/ }).click();
  await expect(
    page.getByText("Hampton University", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Join match" })).toHaveAttribute(
    "href",
    "/rooms?code=ABCD1234",
  );
});

test("a missed guest game answer becomes a Learn review connection", async ({
  page,
}) => {
  await page.goto("/practice?mode=category&subject=History");
  const stem = await page.locator(".solo-question h1").innerText(),
    q = questions.find((q) => questionStem(q.text) === stem)!;
  const choices = page.locator(".answer-choices button");
  for (const choice of await choices.all())
    if ((await choice.getAttribute("aria-label")) !== q.answer) {
      await choice.click();
      break;
    }
  await expect(page.locator(".solo-feedback")).toContainText("Incorrect");
  await page.goto("/learn");
  await page.getByRole("button", { name: /Bring it back/ }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: questionStem(q.text), exact: true }),
  ).toBeVisible();
});
