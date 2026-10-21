import { test, expect, type Page } from "@playwright/test";
import { questions } from "../lib/questions";
async function answerQuestion(page: Page, correct = true) {
  const text = await page.locator(".question-stage h1").innerText();
  const q = questions.find((q) => q.text === text);
  expect(q).toBeTruthy();
  await page.getByRole("button", { name: "Buzz in", exact: true }).click();
  await page
    .getByLabel("You’re up. What’s the answer?")
    .fill(correct ? q!.answer : "Definitely not the answer");
  await page.getByRole("button", { name: "Lock it in" }).click();
  await expect(page.getByRole("status")).toContainText(
    correct ? "That’s the one!" : "Ooh, just missed it.",
  );
}
test("review, persistence, and responsive lobby", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Big brain/ })).toBeVisible();
  await page.goto("/practice");
  await page.getByLabel("Subject", { exact: true }).selectOption("History");
  await page.getByRole("button", { name: "Start practice" }).click();
  await answerQuestion(page, false);
  await page.getByRole("link", { name: "Second chance", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1 questions, another opportunity." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practise review queue" }).click();
  await answerQuestion(page);
  await page.getByRole("button", { name: "The final scores" }).click();
  await expect(
    page.getByRole("heading", { name: "Absolutely nailed it." }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await page.reload();
  await expect(
    page.getByText("2 played · 1 nailed. Look at you go."),
  ).toBeVisible();
  await page.goto("/review");
  await expect(
    page.getByRole("heading", { name: "A clean slate." }),
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
  await expect(page.getByRole("status")).toContainText("Ooh, just missed it.");
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
  await page.getByRole("link", { name: "Let’s play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Buzz in", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("You’re up. What’s the answer?")).toBeFocused();
  const first = await page.locator(".question-stage h1").innerText();
  await page
    .getByLabel("You’re up. What’s the answer?")
    .fill(questions.find((q) => q.text === first)!.answer);
  await page.getByRole("button", { name: "Lock it in" }).click();
  await expect(page.getByRole("status")).toContainText("+100");
  await page.getByRole("button", { name: "Bring on the next one" }).click();
  for (let i = 1; i < 5; i++) {
    await answerQuestion(page);
    await page
      .getByRole("button", {
        name: i === 4 ? "The final scores" : "Bring on the next one",
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
test("two named players alternate turns and receive separate scores", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Pass & Play/ }).click();
  const dialog = page.locator("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Player 1").fill("Ada");
  await dialog.getByLabel("Player 2").fill("Grace");
  await page.getByRole("button", { name: "Start the showdown" }).click();
  for (let i = 0; i < 8; i++) {
    await expect(page.locator(".party-scoreboard .playing")).toContainText(
      i % 2 === 0 ? "Ada" : "Grace",
    );
    await answerQuestion(page, i % 2 === 0);
    if (i === 0)
      await page.screenshot({
        path: "artifacts/game-round.png",
        fullPage: true,
      });
    await page
      .getByRole("button", {
        name:
          i === 7
            ? "The final scores"
            : `Pass to ${i % 2 === 0 ? "Grace" : "Ada"}`,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Ada takes the crown!" }),
  ).toBeVisible();
  await expect(page.locator(".party-results .winning")).toContainText("400");
  await expect(page.locator(".party-results>div").nth(1)).toContainText("0");
  await page.screenshot({
    path: "artifacts/party-results.png",
    fullPage: true,
  });
});
