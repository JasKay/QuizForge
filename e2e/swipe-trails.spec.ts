import { test, expect } from "./preview";
test("touch swipes skip left, accept right, and short or vertical gestures do not choose", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn");
  await page
    .getByRole("button", { name: "Follow this trail", exact: true })
    .waitFor();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  async function swipe(dx: number, dy = 0) {
    const box = (await page.locator(".tr-swipe-card").boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + 47;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 7; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + (dx * i) / 7, y: y + (dy * i) / 7 }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await swipe(25);
  await expect(page.locator(".tr-hero-copy h2")).toHaveText("Around the world");
  await expect
    .poll(() =>
      page
        .locator(".tr-swipe-card")
        .evaluate((e) => getComputedStyle(e).transform),
    )
    .toBe("matrix(1, 0, 0, 1, 0, 0)");
  await swipe(0, 60);
  await expect(page.locator(".tr-hero-copy h2")).toHaveText("Around the world");
  await swipe(-120);
  await expect(page.locator(".tr-hero-copy h2")).toHaveText(
    "How the world works",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await swipe(120);
  await expect(page.locator(".tr-session-header")).toContainText(
    "How the world works",
  );
  await page.getByRole("button", { name: "Close trail", exact: true }).click();
  await page.locator(".tr-swipe-card").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".tr-hero-copy h2")).toHaveText(
    "People who changed things",
  );
  await page
    .getByRole("button", { name: "Start this trail", exact: true })
    .click();
  await expect(page.locator(".tr-session-header")).toContainText(
    "People who changed things",
  );
});
