import { test, expect, type Page } from "./preview";
async function settled(page: Page) {
  await page.locator(".bz-loading").waitFor({ state: "hidden" });
  await page.waitForTimeout(350);
}
async function fits(page: Page) {
  const bad = await page.evaluate(() => {
    const issues: string[] = [];
    const viewport = window.visualViewport;
    const bottom =
      (viewport?.height || innerHeight) + (viewport?.offsetTop || 0);
    document
      .querySelectorAll<HTMLElement>(
        ".bz-page-item:not(.bz-page-away),.bz-lesson-body,.bz-lesson-footer,.bz-nav,.bz-welcome header,.bz-welcome-copy,.bz-welcome-bottom",
      )
      .forEach((e) => {
        if (!e.getClientRects().length) return;
        const r = e.getBoundingClientRect();
        if (r.bottom > bottom + 2 || r.top < -2 || r.right > innerWidth + 2)
          issues.push(`${e.className}: ${JSON.stringify(r.toJSON())}`);
        if (e.matches(".bz-lesson-body") && e.scrollHeight > e.clientHeight + 2)
          issues.push("Lesson body clipped");
      });
    return issues;
  });
  expect(bad).toEqual([]);
}
for (const size of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 568, height: 320 },
]) {
  test(`mobile screens fit ${size.width}x${size.height}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize(size);
    for (const path of [
      "/welcome",
      "/learn",
      "/play",
      "/teams",
      "/account",
      "/signup",
      "/login",
    ]) {
      await page.goto(path);
      await settled(page);
      await fits(page);
      const next = page.getByRole("button", { name: "Next page", exact: true });
      for (
        let i = 0;
        i < 8 && (await next.isVisible()) && (await next.isEnabled());
        i++
      ) {
        await next.click();
        await page.waitForTimeout(80);
        await fits(page);
      }
    }
  });
}
test("guest learns with support, recalls, retries a miss and keeps progress", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/learn");
  await settled(page);
  const data = await page.evaluate(async () => {
    const r = await fetch("/api/learn?lesson=major-museums");
    return r.json();
  });
  const qs = data.questions.slice(0, 3);
  await page.getByRole("button", { name: "Next topic", exact: true }).click();
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await fits(page);
  await page.getByRole("button", { name: /begin$/ }).click();
  for (const q of qs) {
    await fits(page);
    await page.getByRole("button", { name: /Got it/ }).click();
    await fits(page);
    await page
      .locator(".bz-guided-choices button")
      .filter({ hasText: q.study.answer })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  for (let i = 0; i < 4; i++) {
    const q = qs[i === 3 ? 0 : i];
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(i === 0 ? "Wrong city" : q.study.answer);
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await fits(page);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(page.getByRole("dialog")).toContainText("3 of 3");
  await fits(page);
  await page
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await page.reload();
  await settled(page);
  await page.getByRole("button", { name: "Next topic", exact: true }).click();
  await expect(
    page.getByText("3/10 understood", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/buzzer-learn-mobile.png" });
});
test("focused lesson answer and auth steps fit a keyboard-sized visual viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page.getByRole("button", { name: /begin$/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /Got it/ }).click();
    await page.locator(".bz-guided-choices button").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByLabel("Your answer", { exact: true }).focus();
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", {
      configurable: true,
      get: () => 320,
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(100);
  await fits(page);
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "artifacts/buzzer-keyboard.png" });
  await page.goto("/signup");
  await settled(page);
  await page.getByLabel("Your name", { exact: true }).fill("Curious Learner");
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", {
      configurable: true,
      get: () => 320,
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(100);
  await fits(page);
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await fits(page);
});
