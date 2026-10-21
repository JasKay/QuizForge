export function arcadePoints(
  correct: boolean,
  elapsedMs: number,
  timed: boolean,
  combo: number,
) {
  if (!correct) return 0;
  const speed = timed
    ? Math.max(0, Math.round(50 * (1 - Math.max(0, elapsedMs) / 30000)))
    : 0;
  return Math.round(
    (100 + speed) * Math.min(2, 1 + Math.max(0, combo - 1) * 0.25),
  );
}
export function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function playSound(kind: "buzz" | "correct" | "miss") {
  try {
    if (localStorage.getItem("qf-sound") !== "true") return;
    const ctx = new AudioContext();
    const base = kind === "correct" ? 660 : kind === "buzz" ? 220 : 160;
    [base, kind === "correct" ? 880 : base * 0.75].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(
        0.08,
        ctx.currentTime + i * 0.1 + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.1 + 0.15,
      );
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + i * 0.1);
      oscillator.stop(ctx.currentTime + i * 0.1 + 0.16);
    });
    setTimeout(() => void ctx.close(), 500);
  } catch {
    /* Audio is optional. */
  }
}
