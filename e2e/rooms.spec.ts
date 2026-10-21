import { test, expect } from "@playwright/test";
import { questions } from "../lib/questions";
import { mockNarration } from "./narration";
test("host and remote players share reading lockout, race buzzes, and keep scores", async ({
  browser,
  baseURL,
}) => {
  test.skip(process.env.RUN_LIVE_ROOMS !== "1", "Requires Neon");
  test.setTimeout(240000);
  const contexts = await Promise.all(
    [0, 1, 2, 3].map(() =>
      browser.newContext({ baseURL, viewport: { width: 360, height: 640 } }),
    ),
  );
  const [host, a, b, viewer] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  for (const page of [host, a, b, viewer]) await mockNarration(page);
  const headers = { Origin: new URL(baseURL!).origin };
  let code = "";
  try {
    await host.goto("/rooms?host=1");
    await host.getByLabel("Your player name").fill("QA Host");
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect(host.getByRole("heading", { name: "Room ready" })).toBeVisible(
      { timeout: 20000 },
    );
    code = await host.locator(".invite-code strong").innerText();
    for (const [page, name] of [
      [a, "Ada"],
      [b, "Grace"],
      [viewer, "Viewer"],
    ] as const) {
      await page.goto("/rooms");
      await page
        .getByLabel("Room link or code")
        .fill(baseURL + "/rooms?code=" + code);
      await page.getByLabel("Your player name").fill(name);
      if (page === viewer)
        await page.getByLabel("Watch instead of playing").check();
      await page
        .getByRole("button", { name: "Join room", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Room ready" }),
      ).toBeVisible({ timeout: 20000 });
    }
    await expect(host.locator(".compact-roster")).toContainText("Grace", {
      timeout: 15000,
    });
    await host
      .getByRole("button", { name: "Move Grace to Team B", exact: true })
      .click();
    await host
      .getByRole("button", { name: "Move Ada to Team A", exact: true })
      .click();
    await expect(
      host.getByRole("button", { name: "Move Ada to Team B", exact: true }),
    ).toBeVisible();
    const split = (
      await (await host.request.get("/api/rooms?code=" + code)).json()
    ).room;
    expect(
      split.members.find((m: { name: string }) => m.name === "Ada").team,
    ).toBe("A");
    expect(
      split.members.find((m: { name: string }) => m.name === "Grace").team,
    ).toBe("B");
    await host.screenshot({ path: "artifacts/trivia-room-waiting.png" });
    await host.getByRole("button", { name: "Start game", exact: true }).click();
    await expect(host.getByLabel("Question being read")).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeDisabled();
    await expect(
      host.locator(".question-reading-overlay .word-read").first(),
    ).toBeVisible({ timeout: 10000 });
    await host.screenshot({ path: "artifacts/trivia-reading-overlay.png" });
    let res = await host.request.post("/api/rooms", {
      headers,
      data: { action: "buzz", code, index: 1 },
    });
    expect(res.status()).toBe(400);
    res = await host.request.post("/api/rooms", {
      headers,
      data: { action: "arm", code, index: 1 },
    });
    expect(res.status()).toBe(400);
    await expect(
      host.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    for (const page of [a, b, viewer])
      await expect(page.getByLabel("Question being read")).toHaveCount(0, {
        timeout: 15000,
      });
    const response = await host.request.get("/api/rooms?code=" + code),
      state = (await response.json()).room;
    expect(state.question.answer).toBeUndefined();
    expect(state.result).toBeNull();
    expect(state.question.choices).toHaveLength(4);
    for (const page of [a, b, viewer]) {
      await expect(page.locator(".compact-question h2")).toHaveText(
        state.question.text,
      );
      await expect(
        page.locator(".answer-choices button").first(),
      ).toBeDisabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBeTruthy();
      await expect(page.locator("input,textarea")).toHaveCount(0);
    }
    await expect(
      viewer.getByRole("button", { name: "Buzz in", exact: true }),
    ).toHaveCount(0);
    res = await viewer.request.post("/api/rooms", {
      headers,
      data: { action: "buzz", code, index: 1 },
    });
    expect(res.status()).toBe(400);
    await host.screenshot({ path: "artifacts/trivia-room-game.png" });
    await host.getByRole("button", { name: "Buzz in", exact: true }).click();
    await host
      .getByRole("button", {
        name: questions.find((q) => q.id === state.question.id)!.answer,
        exact: true,
      })
      .click();
    await expect(host.locator(".compact-feedback")).toContainText("Correct");
    await expect(a.locator(".compact-feedback")).toContainText("Correct", {
      timeout: 15000,
    });
    await expect(host.locator(".compact-room-top")).toContainText("A 10");
    await host
      .getByRole("button", { name: "Next question", exact: true })
      .click();
    await expect(host.getByLabel("Question being read")).toBeVisible();
    await expect(
      a.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    const next = (await (await a.request.get("/api/rooms?code=" + code)).json())
      .room;
    const race = await Promise.all(
      [a, b].map((p) =>
        p.request.post("/api/rooms", {
          headers,
          data: { action: "buzz", code, index: 2 },
        }),
      ),
    );
    expect(race.map((r) => r.status()).sort()).toEqual([200, 400]);
    const winning = race[0].ok() ? a : b;
    await winning
      .getByRole("button", {
        name: questions.find((q) => q.id === next.question.id)!.answer,
        exact: true,
      })
      .click();
    await expect(host.locator(".compact-feedback")).toContainText("Correct", {
      timeout: 15000,
    });
    for (let i = 3; i <= state.total; i++) {
      const nextRes = await host.request.post("/api/rooms", {
        headers,
        data: { action: "next", code, index: i - 1 },
      });
      expect(nextRes.ok()).toBeTruthy();
      const skip = await host.request.post("/api/rooms", {
        headers,
        data: { action: "reveal", code, index: i },
      });
      expect(skip.ok()).toBeTruthy();
    }
    await host.request.post("/api/rooms", {
      headers,
      data: { action: "next", code, index: state.total },
    });
    for (const page of [host, a, b, viewer])
      await expect(
        page.getByRole("heading", { name: "Round complete" }),
      ).toBeVisible({ timeout: 15000 });
    await b.reload();
    await expect(
      b.getByRole("heading", { name: "Round complete" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(host.locator(".compact-roster")).toContainText("QA Host");
    await expect(host.locator(".compact-roster")).toContainText("10");
  } finally {
    if (code)
      await host.request
        .post("/api/rooms", { headers, data: { action: "leave", code } })
        .catch(() => {});
    await Promise.all(contexts.map((c) => c.close()));
  }
});
