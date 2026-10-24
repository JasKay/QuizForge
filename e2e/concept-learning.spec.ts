import { test, expect } from "./preview";
test("a new concept is taught, applied to a different problem, and earns XP only once", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/learn");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .waitFor();
  const data = await page.evaluate(async () => {
    const r = await fetch("/api/learn?lesson=fraction-foundations");
    return r.json();
  });
  const qs = data.questions;
  expect(qs).toHaveLength(3);
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page.getByRole("button", { name: /begin$/ }).click();
  for (const q of qs) {
    await expect(
      page.getByRole("img", { name: /equal parts shaded/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Got it/ }).click();
    await page
      .locator(".bz-guided-choices button")
      .filter({ hasText: q.study.answer })
      .click();
    await expect(page.getByText("+10 XP", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  for (const q of qs) {
    await expect(
      page.getByRole("heading", { name: q.application.text, exact: true }),
    ).toBeVisible();
    const result = await page.evaluate(async (id) => {
      const r = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, answer: "" }),
      });
      return r.json();
    }, q.application.id);
    await page.getByLabel("Your answer", { exact: true }).fill(result.answer);
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(page.getByText("60 XP earned", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await expect(page.locator(".bz-learning-xp")).toContainText("60 XP");
  await page
    .getByRole("button", { name: "Continue lesson", exact: true })
    .click();
  await page.getByRole("button", { name: /begin$/ }).click();
  await page.getByRole("button", { name: /Got it/ }).click();
  await page
    .locator(".bz-guided-choices button")
    .filter({ hasText: qs[0].study.answer })
    .click();
  await expect(page.locator(".bz-xp-feedback")).toHaveCount(0);
});
