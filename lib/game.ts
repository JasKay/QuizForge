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
let audio: AudioContext | null = null;
function context() {
  if (!audio || audio.state === "closed") {
    const Ctor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  }
  return audio;
}
export function unlockSound() {
  try {
    if (localStorage.getItem("qf-sound") === "false") return;
    const ctx = context();
    if (ctx?.state === "suspended") void ctx.resume().catch(() => {});
  } catch {}
}
export function playSound(kind: "buzz" | "correct" | "miss") {
  try {
    if (localStorage.getItem("qf-sound") === "false") return;
    const ctx = context();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const notes =
      kind === "correct"
        ? [523.25, 659.25, 783.99]
        : kind === "miss"
          ? [293.66, 220]
          : [220, 330];
    notes.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        at = ctx.currentTime + i * 0.085;
      oscillator.type = kind === "miss" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(
        kind === "miss" ? 0.045 : 0.07,
        at + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.19);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.21);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* Feedback remains visible if audio is unavailable. */
  }
}
