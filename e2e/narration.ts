import type { Page } from "@playwright/test";
export async function mockNarration(page: Page) {
  await page.addInitScript(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const cancel = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel,
        speak: (u: SpeechSynthesisUtterance) => {
          cancel();
          timers.push(
            setTimeout(() => u.onstart?.({} as SpeechSynthesisEvent), 20),
          );
          const offsets = [0];
          for (let i = 0; i < u.text.length; i++)
            if (u.text[i] === " ") offsets.push(i + 1);
          offsets.forEach((charIndex, i) =>
            timers.push(
              setTimeout(
                () => u.onboundary?.({ charIndex } as SpeechSynthesisEvent),
                100 + i * 50,
              ),
            ),
          );
          timers.push(
            setTimeout(
              () => u.onend?.({} as SpeechSynthesisEvent),
              Math.max(1800, offsets.length * 50 + 200),
            ),
          );
        },
      },
    });
  });
}
