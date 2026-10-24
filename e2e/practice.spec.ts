import { test, expect, type Page } from "./preview";
import { questions } from "../lib/questions";
import { mockFeedback, tones } from "./feedback";
import { questionStem } from "../lib/choices";
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const main = page.locator(".trivia-main");
  if (await main.count())
    expect(
      await main.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBeTruthy();
}
async function answer(page: Page, correct = true) {
  const text = await page.locator(".solo-question h1").innerText(),
    q = questions.find(
      (q) =>
        questionStem(q.text).replace(/\s+/g, " ").trim() ===
        text.replace(/\s+/g, " ").trim(),
    )!;
  expect(q).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Buzz in", exact: true }),
  ).toHaveCount(0);
  const options = page.locator(".answer-choices button");
  await expect(options.first()).toBeEnabled();
  if (correct)
    await page.getByRole("button", { name: q.answer, exact: true }).click();
  else {
    for (const option of await options.all())
      if ((await option.getAttribute("aria-label")) !== q.answer) {
        await option.click();
        break;
      }
  }
  await expect(page.getByRole("status")).toContainText(
    correct ? "Correct" : "Incorrect",
  );
  await fits(page);
}
test.beforeEach(async ({ page }) =>
  page.setViewportSize({ width: 360, height: 640 }),
);
test("Buzzer welcome and navigation use real identity and existing game screens fit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little more/ }),
  ).toBeVisible();
  await expect(page.getByText(/Alex|Train together|Win together/)).toHaveCount(
    0,
  );
  await expect(page.locator("nav,footer")).toHaveCount(0);
  await expect(page.locator(".bz-logo")).toHaveText("Buzzer!");
  await page.goto("/play");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Just give me five questions/ }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/buzzer-play.png" });
  for (const path of [
    "/practice",
    "/rooms",
    "/rooms?host=1",
    "/ultimate",
    "/profile",
    "/review",
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".trivia-main")).toBeVisible();
    await fits(page);
    await expect(page.locator("nav,footer")).toHaveCount(0);
  }
});
test("quick play answers immediately, preserves scores, and exposes stats and review through profile", async ({
  page,
}) => {
  await page.goto("/practice?mode=quick");
  await answer(page, false);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await answer(page);
  await page.screenshot({ path: "artifacts/trivia-solo.png" });
  await page.getByRole("link", { name: "Exit game" }).click();
  await page.goto("/profile");
  await expect(page.locator(".profile-stats")).toContainText("50%");
  await expect(page.getByText("1 to revisit", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit name" }).click();
  await page.getByLabel("Display name").fill("Jordan");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Jordan", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Review missed answers" }).click();
  await page.getByRole("button", { name: "Start review" }).click();
  await answer(page);
  await page.getByRole("button", { name: "Results", exact: true }).click();
  await expect(page.locator(".solo-results")).toContainText("1 / 1");
  await fits(page);
});
test("categories show filters instead of a question dump, and start a filtered round", async ({
  page,
}) => {
  await page.goto("/practice");
  await page.getByLabel("Subject", { exact: true }).selectOption("History");
  await page.getByLabel("Difficulty", { exact: true }).selectOption("Medium");
  const count = questions.filter(
    (q) => q.subject === "History" && q.difficulty === "Medium",
  ).length;
  await expect(page.locator(".category-match strong")).toHaveText(
    String(count),
  );
  await expect(page.locator(".question-list,.category-grid")).toHaveCount(0);
  await fits(page);
  await page.screenshot({ path: "artifacts/trivia-categories.png" });
  await page.getByRole("button", { name: "Start practice" }).click();
  const stem = await page.locator(".solo-question h1").innerText();
  expect(questions.find((q) => questionStem(q.text) === stem)?.subject).toBe(
    "History",
  );
  await answer(page);
  const styles = await page.locator(".solo-question h1").evaluate((el) => ({
    border: getComputedStyle(el).borderWidth,
    background: getComputedStyle(el).backgroundColor,
  }));
  expect(styles.border).toBe("0px");
  expect(styles.background).toBe("rgba(0, 0, 0, 0)");
  await expect(page.locator(".question-subject")).toHaveCount(0);
  await expect(page.locator(".question-category")).toHaveText("History");
});
test("quick play completes a five-question round and can replay", async ({
  page,
}) => {
  await page.goto("/practice?mode=quick");
  for (let i = 0; i < 5; i++) {
    await answer(page);
    await page
      .getByRole("button", { name: i === 4 ? "Results" : "Next", exact: true })
      .click();
  }
  await expect(page.locator(".solo-results")).toContainText("750");
  await fits(page);
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.locator(".solo-question h1")).toBeVisible();
});
test("profile name editing fits when the keyboard reduces available space", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit name" }).click();
  await page.getByLabel("Display name").focus();
  await page.setViewportSize({ width: 360, height: 390 });
  await fits(page);
  const b = await page
    .getByRole("button", { name: "Save", exact: true })
    .boundingBox();
  expect(b!.y + b!.height).toBeLessThanOrEqual(390);
});

test("answer sounds are distinct, enabled by default, and can be muted in My Profile", async ({
  page,
}) => {
  await mockFeedback(page);
  await page.goto("/practice?mode=quick");
  await answer(page, false);
  expect((await tones(page)).slice(-2)).toEqual([293.66, 220]);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await answer(page);
  expect((await tones(page)).slice(-3)).toEqual([523.25, 659.25, 783.99]);
  await page.goto("/profile");
  const toggle = page.getByRole("switch", { name: "Sound effects" });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await page.goto("/practice?mode=quick");
  await answer(page);
  expect(await tones(page)).toEqual([]);
  await page.goto("/profile");
  await toggle.click();
  expect((await tones(page)).slice(-3)).toEqual([523.25, 659.25, 783.99]);
  await fits(page);
});
