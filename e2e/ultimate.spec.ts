import { test, expect } from "@playwright/test";
import { ultimatePacks } from "../lib/ultimate-packs";
import { choicesForQuestion, questionStem } from "../lib/choices";
test("Ultimate Challenge offers topic packs, recycles passes and misses, scores 250, and ends at sixty seconds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await expect(page.locator(".home-six>*")).toHaveCount(6);
  await page.getByRole("link", { name: /Ultimate Challenge/ }).click();
  await expect(
    page.getByRole("heading", { name: "Ultimate Challenge", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ultimate-topic-grid>button")).toHaveCount(4);
  const pack = ultimatePacks[0];
  await page.getByRole("button", { name: /Solar System/ }).click();
  const heading = page.locator(".ultimate-stage h1");
  const choose = async (i: number) => {
    await expect(heading).toHaveText(questionStem(pack.questions[i].text));
    await page
      .locator(".answer-choices")
      .getByRole("button", { name: pack.questions[i].answer, exact: true })
      .click();
  };
  await expect(heading).toHaveText(questionStem(pack.questions[0].text));
  await expect(page.locator(".answer-choices button")).toHaveCount(4);
  await expect(
    page.locator(".ultimate-game input, .ultimate-game textarea"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.scrollingElement!.scrollHeight <= innerHeight,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "artifacts/mobile-ultimate-question.png" });
  const wrong = choicesForQuestion(pack.questions[0], pack.questions).find(
    (v) => v !== pack.questions[0].answer,
  )!;
  await page
    .locator(".answer-choices")
    .getByRole("button", { name: wrong, exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("will come back");
  await expect(heading).toHaveText(questionStem(pack.questions[1].text));
  await page.getByRole("button", { name: "Pass", exact: true }).click();
  await expect(heading).toHaveText(questionStem(pack.questions[2].text));
  for (let i = 2; i < 10; i++) {
    await choose(i);
    await expect(heading).toHaveText(
      questionStem(pack.questions[i < 9 ? i + 1 : 0].text),
    );
  }
  await choose(0);
  await choose(1);
  await expect(page.locator(".ultimate-score")).toHaveText("250 / 250");
  await expect(
    page.getByText("10 of 10 cleared", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("qf-ultimate-history")!)[0].score,
    ),
  ).toBe(250);
  await page.clock.install();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("60s");
  await page.clock.fastForward(61000);
  await expect(page.locator(".ultimate-score")).toHaveText("0 / 250");
  await expect(page.locator(".ultimate-game")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Choose another topic", exact: true })
    .click();
  await expect(page.locator(".ultimate-topic-grid>button")).toHaveCount(4);
});
