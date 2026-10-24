import { test, expect } from "./preview";
test("CSS layout stays consistent across 1x, 2x and 3x phone resolutions", async ({
  browser,
  baseURL,
}) => {
  let baseline: unknown;
  for (const scale of [1, 2, 3]) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: scale,
      isMobile: true,
      hasTouch: true,
    });
    try {
      if (process.env.VERCEL_OIDC_TOKEN)
        await context.route(`${baseURL}/**`, (r) =>
          r.continue({
            headers: {
              ...r.request().headers(),
              "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN!,
            },
          }),
        );
      const page = await context.newPage();
      await page.goto("/play");
      await page.locator(".tr-game-card").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const layout = await page
        .locator(".tr-play")
        .evaluate((e) => ({
          width: e.clientWidth,
          height: e.clientHeight,
          heading: getComputedStyle(e.querySelector("h1")!).fontSize,
          cards: [...e.querySelectorAll(".tr-game-card")].map((c) => ({
            width: c.clientWidth,
            height: c.clientHeight,
            font: getComputedStyle(c.querySelector("h2")!).fontSize,
          })),
        }));
      if (baseline) expect(layout).toEqual(baseline);
      else baseline = layout;
    } finally {
      await context.close();
    }
  }
});
test("notch space and changing browser bars preserve the primary controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/learn");
  await page
    .getByRole("button", { name: "Follow this trail", exact: true })
    .waitFor();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--bz-safe-top", "44px");
    document.documentElement.style.setProperty("--bz-safe-bottom", "34px");
  });
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 690 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const path of ["/learn", "/play", "/teams"]) {
      await page.goto(path);
      await page.addStyleTag({
        content: ":root{--bz-safe-top:44px;--bz-safe-bottom:34px}",
      });
      await page.locator(".tr-home").waitFor();
      if (path === "/learn")
        await page
          .getByRole("button", { name: "Follow this trail", exact: true })
          .waitFor();
      await expect
        .poll(() =>
          page
            .locator(".tr-home")
            .evaluate((e) => e.scrollHeight - e.clientHeight),
        )
        .toBeLessThanOrEqual(2);
      if (path === "/play") {
        for (const card of await page.locator(".tr-game-card").all())
          await expect(card).toBeInViewport();
      }
    }
  }
});
