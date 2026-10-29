import { test, expect, type Page } from "./preview";
import { questions } from "../lib/questions";
import { choicesForQuestion, questionStem } from "../lib/choices";
async function settled(page: Page) {
  await page.locator(".bz-loading").waitFor({ state: "hidden" });
  if (new URL(page.url()).pathname === "/learn")
    await page
      .getByRole("button", { name: /Follow this trail|Continue this trail/ })
      .waitFor();
  else await page.locator(".buzzer-app").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
}
async function fits(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const bad: string[] = [];
        for (const e of document.querySelectorAll<HTMLElement>(
          ".tr-home,.tr-session-body,.tr-session-footer,.tr-welcome,.bz-page-item:not(.bz-page-away)",
        )) {
          if (!e.getClientRects().length || e.closest("[inert]")) continue;
          const r = e.getBoundingClientRect();
          if (
            r.bottom > innerHeight + 2 ||
            r.right > innerWidth + 2 ||
            r.top < -2
          )
            bad.push(`${e.className}: outside viewport`);
          if (
            e.matches(".tr-home,.tr-session-body,.tr-welcome") &&
            !e.matches(".ms-home,.ms-connected-learn,.ms-team-home") &&
            (e.scrollHeight > e.clientHeight + 2 ||
              e.scrollWidth > e.clientWidth + 2)
          )
            bad.push(
              `${e.className}: clips ${e.scrollHeight}/${e.clientHeight}`,
            );
        }
        return bad;
      }),
    )
    .toEqual([]);
}
for (const size of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 568, height: 320 },
])
  test(`four destinations and auth fit ${size.width}x${size.height}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize(size);
    for (const path of [
      "/welcome",
      "/learn",
      "/play",
      "/teams",
      "/mastery",
      "/signup",
      "/login",
    ]) {
      await page.goto(path);
      await settled(page);
      await fits(page);
      if (path === "/play") {
        await expect(page.locator(".tr-game-card")).toHaveCount(3);
        for (const card of await page.locator(".tr-game-card").all())
          await expect(card).toBeInViewport();
        await expect(
          page.getByRole("button", { name: "Next page", exact: true }),
        ).toHaveCount(0);
      }
    }
  });
test("trivia discovers related facts, earns XP, continues to new questions and remembers the trail", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/learn");
  await settled(page);
  const catalog = await page.evaluate(async () =>
    (await fetch("/api/learn")).json(),
  );
  expect(catalog.catalog.length).toBeGreaterThan(20);
  expect(
    catalog.catalog.some((t: any) => t.id === "fraction-foundations"),
  ).toBe(false);
  const data = await page.evaluate(async () =>
    (await fetch("/api/learn?trail=trail-geography")).json(),
  );
  await page
    .getByRole("button", { name: "Follow this trail", exact: true })
    .click();
  for (const [i, q] of data.questions.entries()) {
    await expect(
      page.getByRole("heading", { name: q.text, exact: true }),
    ).toBeVisible();
    await fits(page);
    if (i === 0)
      await page
        .getByRole("button", { name: "I don't know yet", exact: true })
        .click();
    else
      await page
        .locator(".tr-trivia-choices button")
        .filter({ hasText: q.study.answer })
        .click();
    await expect(
      page.getByRole("heading", { name: q.study.answer, exact: true }),
    ).toBeVisible();
    await fits(page);
    await page
      .getByRole("button", {
        name:
          i === data.questions.length - 1
            ? "See my progress"
            : "Next connection",
        exact: true,
      })
      .click();
  }
  const earnedXp = data.questions
    .slice(1)
    .reduce(
      (n: number, q: { id: string }) =>
        n +
        { Easy: 10, Medium: 20, Hard: 40 }[
          questions.find((item) => item.id === q.id)!.difficulty
        ],
      0,
    );
  await expect(page.getByText(`+${earnedXp}`, { exact: true })).toBeVisible();
  await expect(page.locator(".tr-related button")).toHaveCount(2);
  await fits(page);
  await page
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await expect(page.locator(".tr-session-body h1")).not.toHaveText(
    data.questions[0].text,
  );
  await expect(page.locator(".tr-session-body h1")).not.toHaveText(
    data.questions[1].text,
  );
  await page.getByRole("button", { name: "Close trail", exact: true }).click();
  await page.reload();
  await settled(page);
  await expect(page.locator(".tr-xp-strip")).toContainText(`${earnedXp} XP`);
  await expect(page.locator(".tr-hero-top")).toContainText("37 to discover");
  await page.getByRole("button", { name: "All topics", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Pick a rabbit hole." }),
  ).toBeVisible();
  await fits(page);
  await page.getByRole("button", { name: /How the world works/ }).click();
  await expect(page.locator(".tr-hero-copy")).toContainText(
    "How the world works",
  );
  await page.reload();
  await settled(page);
  await expect(page.locator(".tr-hero-copy")).toContainText(
    "How the world works",
  );
  await page.screenshot({ path: "artifacts/buzzer-trivia-learn.png" });
});
test("long questions and answer choices stay readable on the smallest phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/learn");
  await settled(page);
  const base = await page.evaluate(async () =>
    (await fetch("/api/learn")).json(),
  );
  const examples = [
    questions.find((q) => q.text.includes("UNESCO"))!,
    [...questions].sort(
      (a, b) => questionStem(b.text).length - questionStem(a.text).length,
    )[0],
  ];
  for (const q of examples) {
    await page.route("**/api/learn?trail=trail-geography*", (route) =>
      route.fulfill({
        json: {
          ...base,
          questions: [
            {
              id: q.id,
              text: questionStem(q.text),
              choices: choicesForQuestion(q, questions),
              source: q.source,
              study: { answer: q.answer, explanation: q.explanation },
            },
          ],
        },
      }),
    );
    await page
      .getByRole("button", { name: /Follow this trail|Continue this trail/ })
      .click();
    await expect(
      page.getByRole("heading", { name: questionStem(q.text), exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(150);
    await fits(page);
    for (const choice of await page.locator(".tr-trivia-choices button").all())
      await expect(choice).toBeInViewport();
    await page
      .locator(".tr-trivia-choices button")
      .filter({ hasText: q.answer })
      .click();
    await page.waitForTimeout(100);
    await fits(page);
    await page
      .getByRole("button", { name: "See my progress", exact: true })
      .click();
    await fits(page);
    await page
      .getByRole("button", { name: "Back to my trails", exact: true })
      .click();
    await page.unroute("**/api/learn?trail=trail-geography*");
  }
});
test("Play opens the actual HCASC host flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/play");
  await page.getByRole("link", { name: /MULTIPLAYER \/ HCASC/ }).click();
  await expect(page).toHaveURL(/\/rooms\?host=1&mode=hcasc/);
  await expect(page.getByLabel("Game format")).toHaveValue("hcasc");
  await expect(
    page.getByRole("button", { name: "Create room", exact: true }),
  ).toBeVisible();
});
