import type { Page } from "@playwright/test";
export async function mockFeedback(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __tones: number[];
      __resumes: number;
      AudioContext: unknown;
    };
    w.__tones = [];
    w.__resumes = 0;
    class FakeAudio {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume() {
        this.state = "running";
        w.__resumes++;
        return Promise.resolve();
      }
      createOscillator() {
        return {
          type: "sine",
          frequency: { value: 0 },
          onended: null as null | (() => void),
          connect() {},
          disconnect() {},
          start() {
            w.__tones.push(this.frequency.value);
          },
          stop() {
            this.onended?.();
          },
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
          disconnect() {},
        };
      }
    }
    Object.defineProperty(window, "AudioContext", {
      value: FakeAudio,
      configurable: true,
    });
  });
}
export async function tones(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __tones: number[] }).__tones,
  );
}
