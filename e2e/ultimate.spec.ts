import { test, expect, type Page } from "@playwright/test";
import { ultimatePacks } from "../lib/ultimate-packs";
import { questionStem } from "../lib/choices";
async function mockSpeech(page: Page) {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onresult:
        | ((e: {
            results: { isFinal: boolean; 0: { transcript: string } }[];
          }) => void)
        | null = null;
      receive = (e: Event) =>
        this.onresult?.({
          results: [
            {
              isFinal: true,
              0: { transcript: (e as CustomEvent<string>).detail },
            },
          ],
        });
      fail = (e: Event) =>
        this.onerror?.({ error: (e as CustomEvent<string>).detail });
      start() {
        window.addEventListener("test-speech", this.receive);
        window.addEventListener("test-speech-error", this.fail);
        this.onstart?.();
      }
      abort() {
        window.removeEventListener("test-speech", this.receive);
        window.removeEventListener("test-speech-error", this.fail);
        this.onend?.();
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: FakeRecognition,
      configurable: true,
    });
  });
}
test("spoken Ultimate Challenge recycles misses, scores once, and stops at sixty seconds", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await expect(page.locator(".trivia-modes>*")).toHaveCount(4);
  await page.getByRole("link", { name: /Ultimate Challenge/ }).click();
  await expect(page.locator(".ultimate-topic-grid>button")).toHaveCount(4);
  const pack = ultimatePacks[0];
  await page.getByRole("button", { name: /Solar System/ }).click();
  const heading = page.locator(".ultimate-stage h1");
  const speak = async (i: number, value = pack.questions[i].answer) => {
    await expect(heading).toHaveText(questionStem(pack.questions[i].text));
    await expect(page.locator(".voice-listening")).toContainText("Listening");
    await page.evaluate((v) => {
      window.dispatchEvent(new CustomEvent("test-speech", { detail: v }));
      window.dispatchEvent(new CustomEvent("test-speech", { detail: v }));
    }, value);
  };
  await expect(heading).toHaveText(questionStem(pack.questions[0].text));
  await expect(
    page.locator(
      ".ultimate-game .answer-choices,.ultimate-game input,.ultimate-game textarea",
    ),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.scrollingElement!.scrollHeight <= innerHeight,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "artifacts/mobile-ultimate-question.png" });
  await speak(0, "Wrong answer");
  await expect(page.getByRole("status")).toContainText("Incorrect");
  await expect(heading).toHaveText(questionStem(pack.questions[1].text));
  await page.getByRole("button", { name: "Pass", exact: true }).click();
  for (let i = 2; i < 10; i++) {
    await speak(i);
    await expect(heading).toHaveText(
      questionStem(pack.questions[i < 9 ? i + 1 : 0].text),
    );
  }
  await speak(0);
  await speak(1);
  await expect(page.locator(".ultimate-score")).toHaveText("250 / 250");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("qf-ultimate-history")!)[0].score,
    ),
  ).toBe(250);
  await page.clock.install();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".voice-listening")).toContainText("Listening");
  await page.clock.fastForward(61000);
  await expect(page.locator(".ultimate-score")).toHaveText("0 / 250");
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("test-speech", { detail: "Mercury" })),
  );
  await expect(page.locator(".ultimate-score")).toHaveText("0 / 250");
});
test("voice support and permission failures do not start a round", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/ultimate");
  await page.getByRole("button", { name: /Solar System/ }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "unavailable",
  );
  await expect(page.locator(".ultimate-game")).toHaveCount(0);
});
test("recognition errors show retry and do not award points", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.goto("/ultimate");
  await page.getByRole("button", { name: /Solar System/ }).click();
  await expect(page.locator(".voice-listening")).toContainText("Listening");
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test-speech-error", { detail: "not-allowed" }),
    ),
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "denied",
  );
  await page.getByRole("button", { name: "Retry microphone" }).click();
  await expect(page.locator(".voice-listening")).toContainText("Listening");
  await expect(page.locator(".ultimate-progress")).toContainText("0 pts");
});
test("microphone denial leaves timer unstarted", async ({ page }) => {
  await mockSpeech(page);
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.goto("/ultimate");
  await page.getByRole("button", { name: /Solar System/ }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Microphone access is required",
  );
  await expect(page.getByRole("timer")).toHaveCount(0);
});
