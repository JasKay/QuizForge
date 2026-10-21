import { test, expect } from "@playwright/test";
import { questions } from "../lib/questions";
import { mockNarration } from "./narration";
import { mockFeedback, tones } from "./feedback";
test("a missed answer passes only to the other team, hides the answer, and plays feedback on every phone", async ({
  browser,
  baseURL,
}) => {
  test.skip(process.env.RUN_LIVE_ROOMS !== "1", "Requires Neon");
  test.setTimeout(150000);
  const contexts = await Promise.all(
    [0, 1, 2].map(() =>
      browser.newContext({ baseURL, viewport: { width: 360, height: 640 } }),
    ),
  );
  const [host, remote, viewer] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  for (const p of [host, remote, viewer]) {
    await mockNarration(p);
    await mockFeedback(p);
  }
  const headers = { Origin: new URL(baseURL!).origin };
  let code = "";
  try {
    let res = await contexts[0].request.post("/api/rooms", {
      headers,
      data: {
        action: "create",
        name: "Host A",
        title: "Steal QA",
        count: 3,
        seconds: 30,
        focus: "HBCU History",
      },
    });
    expect(res.ok()).toBeTruthy();
    code = (await res.json()).room.code;
    for (const [c, name, watch] of [
      [contexts[1], "Remote B", false],
      [contexts[2], "Viewer", true],
    ] as const) {
      res = await c.request.post("/api/rooms", {
        headers,
        data: { action: "join", code, name, watch },
      });
      expect(res.ok()).toBeTruthy();
    }
    for (const p of [host, remote, viewer]) {
      await p.goto("/rooms?code=" + code);
      await p.getByRole("heading", { name: "Room ready" }).click();
    }
    await host.getByRole("button", { name: "Start game" }).click();
    await expect(
      host.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    const state = (
        await (await host.request.get("/api/rooms?code=" + code)).json()
      ).room,
      correct = questions.find((q) => q.id === state.question.id)!.answer;
    const wrong = state.question.choices.find((v: string) => v !== correct)!;
    await host.getByRole("button", { name: "Buzz in", exact: true }).click();
    await host.getByRole("button", { name: wrong, exact: true }).click();
    for (const p of [host, remote, viewer]) {
      await expect(p.locator(".compact-feedback")).toContainText("Team B");
      await expect
        .poll(async () => (await tones(p)).slice(-2))
        .toEqual([293.66, 220]);
    }
    let pending = (
      await (await remote.request.get("/api/rooms?code=" + code)).json()
    ).room;
    expect(pending.result.answer).toBeUndefined();
    expect(pending.result.explanation).toBeUndefined();
    await host.screenshot({ path: "artifacts/trivia-second-chance.png" });
    await host
      .getByRole("button", { name: "Pass to Team B", exact: true })
      .click();
    await expect(
      remote.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled();
    await expect(
      host.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeDisabled();
    await expect(remote.getByLabel("Question being read")).toHaveCount(0);
    await remote.getByRole("button", { name: "Buzz in", exact: true }).click();
    await remote.getByRole("button", { name: correct, exact: true }).click();
    for (const p of [host, remote, viewer]) {
      await expect(p.locator(".compact-feedback")).toContainText("Correct");
      await expect
        .poll(async () => (await tones(p)).slice(-3))
        .toEqual([523.25, 659.25, 783.99]);
    }
    const before = await tones(remote);
    await remote.waitForTimeout(1600);
    expect(await tones(remote)).toEqual(before);
    await host
      .getByRole("button", { name: "Next question", exact: true })
      .click();
    await expect(
      remote.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    const second = (
        await (await remote.request.get("/api/rooms?code=" + code)).json()
      ).room,
      answer = questions.find((q) => q.id === second.question.id)!.answer,
      miss = second.question.choices.find((v: string) => v !== answer)!;
    await remote.getByRole("button", { name: "Buzz in", exact: true }).click();
    await remote.getByRole("button", { name: miss, exact: true }).click();
    await host
      .getByRole("button", { name: "Pass to Team A", exact: true })
      .click();
    await expect(
      host.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled();
    await expect(
      remote.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeDisabled();
    await host.getByRole("button", { name: "Buzz in", exact: true }).click();
    await host.getByRole("button", { name: miss, exact: true }).click();
    await expect(host.locator(".compact-feedback")).toContainText(answer);
    await expect(
      host.getByRole("button", { name: /Pass to Team/ }),
    ).toHaveCount(0);
    await expect(
      host.getByRole("button", { name: "Next question", exact: true }),
    ).toBeVisible();
    pending = (await (await host.request.get("/api/rooms?code=" + code)).json())
      .room;
    expect(pending.attempt).toBe(2);
    expect(pending.steal_available).toBe(false);
    expect(
      pending.members.find((m: { name: string }) => m.name === "Remote B")
        .score,
    ).toBe(10);
  } finally {
    if (code)
      await contexts[0].request
        .post("/api/rooms", { headers, data: { action: "leave", code } })
        .catch(() => {});
    await Promise.all(contexts.map((c) => c.close()));
  }
});
