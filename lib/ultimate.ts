export type UltimateRun = {
  queue: number[];
  cleared: number[];
  attempts: number;
};
export function createUltimateRun(size = 10): UltimateRun {
  if (size !== 10)
    throw Error("Ultimate Challenge requires exactly ten questions.");
  return {
    queue: Array.from({ length: size }, (_, i) => i),
    cleared: [],
    attempts: 0,
  };
}
export function advanceUltimate(
  run: UltimateRun,
  question: number,
  correct: boolean,
): UltimateRun {
  if (run.queue[0] !== question || run.cleared.includes(question)) return run;
  const rest = run.queue.slice(1);
  return {
    queue: correct ? rest : [...rest, question],
    cleared: correct ? [...run.cleared, question] : run.cleared,
    attempts: run.attempts + 1,
  };
}
export function ultimateScore(run: UltimateRun) {
  return run.cleared.length * 25;
}
