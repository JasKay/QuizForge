import { test, expect } from "@playwright/test";
import { questions } from "../lib/questions";
test("separate phones share questions, race buzzes, watch, and retain team results", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.RUN_LIVE_ROOMS !== "1",
    "Set RUN_LIVE_ROOMS=1 after provisioning and migrating Neon.",
  );
  test.setTimeout(120000);
  const contexts = await Promise.all([
    browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } }),
    browser.newContext({ baseURL, viewport: { width: 390, height: 844 } }),
    browser.newContext({ baseURL, viewport: { width: 414, height: 896 } }),
    browser.newContext({ baseURL, viewport: { width: 390, height: 844 } }),
  ]);
  const [host, a, b, viewer] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  let code = "";
  try {
    await host.goto("/rooms?host=1");
    await host.getByLabel("Your player name").fill("QA Coach");
    await host
      .getByLabel("Team or practice name")
      .fill("Cross-device practice check");
    await host.getByLabel("Subject focus").selectOption("History");
    await host
      .getByRole("combobox", { name: "Round length", exact: true })
      .selectOption("5");
    await host
      .getByRole("combobox", { name: "Buzz window after reading", exact: true })
      .selectOption("30");
    await host.getByRole("button", { name: "Create team room" }).click();
    await expect(
      host.getByRole("heading", { name: "The squad’s assembling." }),
    ).toBeVisible({ timeout: 20000 });
    code = await host.locator(".invite-code strong").innerText();
    for (const [page, name] of [
      [a, "Ada Remote"],
      [b, "Grace Remote"],
      [viewer, "Team Viewer"],
    ] as const) {
      await page.goto(
        `/rooms?code=${code}${page === viewer ? "&watch=1" : ""}`,
      );
      await page.getByLabel("Your player name").fill(name);
      await page
        .getByRole("button", {
          name: page === viewer ? "Join as a viewer" : "Let me in",
        })
        .click();
      await expect(
        page.getByRole("heading", { name: "The squad’s assembling." }),
      ).toBeVisible({ timeout: 20000 });
    }
    await expect(host.locator(".room-roster")).toContainText("Grace Remote", {
      timeout: 15000,
    });
    await host
      .getByRole("button", { name: "Start practice", exact: true })
      .click();
    await expect(a.locator(".room-stage>h2")).toBeVisible({ timeout: 15000 });
    const question = await a.locator(".room-stage>h2").innerText();
    for (const page of [host, b, viewer])
      await expect(page.locator(".room-stage>h2")).toHaveText(question, {
        timeout: 15000,
      });
    await expect(
      viewer.getByRole("button", { name: "Buzz in", exact: true }),
    ).toHaveCount(0);
    const before = await a.request.get(`/api/rooms?code=${code}`);
    const state = (await before.json()).room;
    expect(state.question.answer).toBeUndefined();
    expect(state.result).toBeNull();
    const origin = new URL(baseURL!).origin;
    const headers = { Origin: origin };
    const forbidden = await viewer.request.post("/api/rooms", {
      headers,
      data: { action: "buzz", code, index: 1 },
    });
    expect(forbidden.status()).toBe(400);
    const csrf = await a.request.post("/api/rooms", {
      headers: { Origin: "https://evil.example" },
      data: { action: "buzz", code, index: 1 },
    });
    expect(csrf.status()).toBe(403);
    for (const page of [a, b, viewer])
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    await host
      .getByRole("button", { name: "Open buzzers", exact: true })
      .click();
    await viewer.screenshot({
      path: "artifacts/mobile-viewer.png",
      fullPage: true,
    });
    const race = await Promise.all([
      a.request.post("/api/rooms", {
        headers,
        data: { action: "buzz", code, index: 1 },
      }),
      b.request.post("/api/rooms", {
        headers,
        data: { action: "buzz", code, index: 1 },
      }),
    ]);
    expect(race.map((r) => r.status()).sort()).toEqual([200, 400]);
    const winning = race[0].ok() ? a : b;
    await expect(
      winning.getByLabel("Your answer", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await winning
      .getByLabel("Your answer", { exact: true })
      .fill(questions.find((q) => q.id === state.question.id)!.answer);
    await winning.getByRole("button", { name: "Lock it in" }).click();
    for (const page of [host, a, b, viewer])
      await expect(page.locator(".game-feedback")).toContainText(
        "That’s the one!",
        {
          timeout: 15000,
        },
      );
    await winning.screenshot({
      path: "artifacts/mobile-team-answer.png",
      fullPage: true,
    });
    for (let next = 2; next <= state.total; next++) {
      await host
        .getByRole("button", { name: "Next question", exact: true })
        .click();
      await host
        .getByRole("button", { name: "Skip & reveal answer", exact: true })
        .click();
    }
    await host.getByRole("button", { name: "See team results" }).click();
    for (const page of [host, a, b, viewer])
      await expect(
        page.getByRole("heading", { name: "That’s a team effort." }),
      ).toBeVisible({ timeout: 15000 });
    await b.reload();
    await expect(
      b.getByRole("heading", { name: "That’s a team effort." }),
    ).toBeVisible({ timeout: 15000 });
    await expect(b.locator(".team-podium .first")).toContainText("10");
    await host.screenshot({
      path: "artifacts/team-room-results.png",
      fullPage: true,
    });
    await host.getByRole("button", { name: "Run another round" }).click();
    await expect(a.locator(".room-stage>h2")).toBeVisible({ timeout: 15000 });
    await expect(a.locator(".room-player-scores")).not.toContainText("10");
  } finally {
    if (code)
      await host.request
        .post("/api/rooms", {
          headers: { Origin: new URL(baseURL!).origin },
          data: { action: "leave", code },
        })
        .catch(() => {});
    await Promise.all(contexts.map((c) => c.close()));
  }
});
