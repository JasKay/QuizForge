import { test, expect } from "@playwright/test";
test("spoken answers share audio and transcription, support moderator correction, and work without speech recognition", async ({
  browser,
  baseURL,
}) => {
  test.skip(process.env.RUN_LIVE_ROOMS !== "1", "Requires migrated Neon.");
  test.setTimeout(120000);
  const contexts = await Promise.all([
    browser.newContext({ baseURL }),
    browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      permissions: ["microphone"],
    }),
    browser.newContext({ baseURL, viewport: { width: 390, height: 844 } }),
  ]);
  const [hc, pc, vc] = contexts;
  const host = await hc.newPage(),
    player = await pc.newPage(),
    viewer = await vc.newPage();
  await player.addInitScript(() => {
    const w = window as any;
    class FakeRecognition {
      lang = "en-US";
      continuous = false;
      interimResults = true;
      onresult: any;
      onerror: any;
      timer: any;
      start() {
        this.timer = setTimeout(() => {
          this.onresult?.({
            results: [
              Object.assign(
                [{ transcript: "A deliberately misheard answer" }],
                { isFinal: true },
              ),
            ],
          });
        }, 1800);
      }
      abort() {
        clearTimeout(this.timer);
      }
    }
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
  });
  const headers = { Origin: new URL(baseURL!).origin };
  let code = "";
  try {
    let res = await hc.request.post("/api/rooms", {
      headers,
      data: {
        action: "create",
        name: "Voice Coach",
        title: "Voice QA",
        focus: "HBCU History",
        count: 3,
        seconds: 30,
      },
    });
    expect(res.ok()).toBeTruthy();
    code = (await res.json()).room.code;
    for (const [c, name, watch] of [
      [pc, "Voice Player", false],
      [vc, "Voice Viewer", true],
    ] as const) {
      res = await c.request.post("/api/rooms", {
        headers,
        data: { action: "join", code, name, watch },
      });
      expect(res.ok()).toBeTruthy();
    }
    await Promise.all(
      [host, player, viewer].map((p) => p.goto("/rooms?code=" + code)),
    );
    await player
      .getByRole("button", { name: "Enable spoken answers", exact: true })
      .click();
    await expect(
      player.getByText("Spoken answers ready", { exact: true }),
    ).toBeVisible();
    res = await hc.request.post("/api/rooms", {
      headers,
      data: { action: "start", code },
    });
    expect(res.ok()).toBeTruthy();
    await expect(
      player.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeDisabled();
    await expect(
      host.getByRole("button", { name: "Open buzzers", exact: true }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Open buzzers", exact: true })
      .click();
    await expect(
      player.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled();
    await player.getByRole("button", { name: "Buzz in", exact: true }).click();
    await expect(viewer.locator(".buzz-winner-label")).toContainText(
      "Voice Player",
    );
    for (const p of [host, player, viewer]) {
      await expect(p.locator(".shared-voice audio")).toBeVisible({
        timeout: 15000,
      });
      await expect(p.locator(".shared-voice")).toContainText(
        "A deliberately misheard answer",
      );
    }
    const audio = await viewer
      .locator(".shared-voice audio")
      .getAttribute("src");
    expect(audio).toMatch(/^data:audio\/(webm|mp4|ogg).*;base64,/);
    await viewer.locator(".shared-voice strong").click();
    const playback = await viewer
      .locator(".shared-voice audio")
      .evaluate(async (el) => {
        const a = el as HTMLAudioElement;
        await a.play();
        return { paused: a.paused, duration: a.duration, error: a.error?.code };
      });
    expect(playback.paused).toBe(false);
    expect(playback.error).toBeUndefined();
    await host
      .getByRole("button", { name: "Spoken answer is correct", exact: true })
      .click();
    await expect(viewer.locator(".game-feedback")).toContainText(
      "That’s the one!",
    );
    await host
      .getByRole("button", { name: "Spoken answer is correct", exact: true })
      .click();
    await expect(viewer.locator(".room-player-scores")).toContainText("10");
    await player.screenshot({
      path: "artifacts/mobile-voice-answer.png",
      fullPage: true,
    });
    await host
      .getByRole("button", { name: "Next question", exact: true })
      .click();
    await player.evaluate(() => {
      const w = window as any;
      w.SpeechRecognition = undefined;
      w.webkitSpeechRecognition = undefined;
    });
    await expect(player.locator(".shared-voice")).toHaveCount(0);
    await host
      .getByRole("button", { name: "Open buzzers", exact: true })
      .click();
    await expect(
      player.getByRole("button", { name: "Buzz in", exact: true }),
    ).toBeEnabled();
    await player.getByRole("button", { name: "Buzz in", exact: true }).click();
    await expect(viewer.locator(".shared-voice")).toContainText(
      "No transcript available",
      { timeout: 15000 },
    );
    await host
      .getByRole("button", { name: "Spoken answer is correct", exact: true })
      .click();
    await expect(viewer.locator(".room-player-scores")).toContainText("20");
    for (const p of [player, viewer])
      expect(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
  } finally {
    if (code)
      await hc.request
        .post("/api/rooms", { headers, data: { action: "leave", code } })
        .catch(() => {});
    await Promise.all(contexts.map((c) => c.close()));
  }
});
