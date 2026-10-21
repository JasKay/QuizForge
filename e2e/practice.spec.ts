import { test, expect, type Page } from "@playwright/test";
import { questionStem } from "../lib/choices";
import { questions } from "../lib/questions";
async function answerQuestion(page: Page, correct = true) {
  const text = await page.locator(".question-stage h1").innerText();
  const q = questions.find(
    (q) =>
      questionStem(q.text).replace(/\s+/g, " ").trim() ===
      text.replace(/\s+/g, " ").trim(),
  );
  expect(q).toBeTruthy();
  await page.getByRole("button", { name: "Buzz in", exact: true }).click();
  const options = page.locator(".answer-choices button");
  await expect(
    page.locator(".game-round input, .game-round textarea"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.scrollingElement!.scrollHeight <= innerHeight,
    ),
  ).toBeTruthy();
  if (correct)
    await page
      .locator(".answer-choices")
      .getByRole("button", { name: q!.answer, exact: true })
      .click();
  else {
    const all = await options.all();
    for (const option of all) {
      if ((await option.getAttribute("aria-label")) !== q!.answer) {
        await option.click();
        break;
      }
    }
  }
  await expect(page.getByRole("status")).toContainText(
    correct ? "Correct" : "Incorrect",
  );
}
test("review, persistence, and responsive lobby", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Let.s play/ })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await expect(page.locator(".home-six>*")).toHaveCount(4);
  for (const tile of await page.locator(".home-six>*").all()) {
    const box = await tile.boundingBox();
    expect(box && box.y >= 0 && box.y + box.height <= 568).toBeTruthy();
  }
  await page.screenshot({ path: "artifacts/mobile-six-home.png" });
  await page.goto("/practice");
  await page.getByLabel("Subject", { exact: true }).selectOption("History");
  await page.getByRole("button", { name: "Start practice" }).click();
  await answerQuestion(page, false);
  await page.getByRole("link", { name: "Lobby", exact: true }).click();
  await page.getByRole("link", { name: "Second chance", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1 questions to review." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practise review queue" }).click();
  await answerQuestion(page);
  await page.getByRole("button", { name: "The final scores" }).click();
  await expect(
    page.getByRole("heading", { name: "Round complete" }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await page.reload();
  await expect(page.getByText("2 played · 1 correct")).toBeVisible();
  await page.goto("/review");
  await expect(
    page.getByRole("heading", { name: "Review complete." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "The lobby", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "artifacts/mobile-game-lobby.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/dashboard");
  await page.screenshot({ path: "artifacts/game-lobby.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("timer expires before buzzing and preferences persist", async ({
  page,
}) => {
  await page.goto("/practice?mode=speed");
  await expect(
    page.getByRole("button", { name: "Buzz in", exact: true }),
  ).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(31000);
  await expect(page.getByRole("status")).toContainText("Incorrect");
  await page.goto("/settings");
  await page.getByLabel("Display name").fill("Jordan");
  await page.getByLabel("Daily question goal").fill("15");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Jordan");
  await expect(page.getByLabel("Daily question goal")).toHaveValue("15");
});
test("quick play scores combos, awards XP, and rematches", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Quick Play" }).click();
  await expect(
    page.getByRole("button", { name: "Buzz in", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  const first = await page.locator(".question-stage h1").innerText();
  const q = questions.find(
    (q) =>
      questionStem(q.text).replace(/\s+/g, " ").trim() ===
      first.replace(/\s+/g, " ").trim(),
  )!;
  await page.getByRole("button", { name: q.answer, exact: true }).click();
  await expect(page.getByRole("status")).toContainText("+100");
  await page.getByRole("button", { name: "Next question" }).click();
  for (let i = 1; i < 5; i++) {
    await answerQuestion(page);
    await page
      .getByRole("button", {
        name: i === 4 ? "The final scores" : "Next question",
      })
      .click();
  }
  await expect(page.locator(".result-score")).toContainText("750");
  await expect(page.locator(".result-facts")).toContainText("+500");
  await page.screenshot({ path: "artifacts/game-results.png", fullPage: true });
  await page.getByRole("button", { name: "One more round" }).click();
  await expect(page.locator(".round-score")).toContainText("0");
  await expect(
    page.getByRole("button", { name: "Buzz in", exact: true }),
  ).toBeVisible();
});
test("removed modes are absent and buzz comes before the question", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await expect(page.getByText("Daily Five", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Pass & Play", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Quick Play" }).click();
  const buzzer = page.getByRole("button", { name: "Buzz in", exact: true });
  const question = page.locator(".question-stage h1");
  const a = await buzzer.boundingBox(),
    b = await question.boundingBox();
  expect(a!.y + a!.height).toBeLessThan(b!.y);
  await expect(page.locator(".answer-choices button:disabled")).toHaveCount(4);
  expect(
    await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".game-round")!)
          .backgroundColor,
    ),
  ).toBe("rgb(255, 255, 255)");
  await page.screenshot({ path: "artifacts/mobile-focused-question.png" });
});
