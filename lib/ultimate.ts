import type { Question } from "./questions";
import type { UltimatePack } from "./ultimate-packs";
import { shuffled } from "./game";

export const ULTIMATE_QUESTION_COUNT = 10;
export const ULTIMATE_POINTS_PER_QUESTION = 50;

export type UltimateRun = {
  queue: number[];
  cleared: number[];
  attempts: number;
};
export function createUltimateRun(size = ULTIMATE_QUESTION_COUNT): UltimateRun {
  if (size !== ULTIMATE_QUESTION_COUNT)
    throw Error(
      `Ultimate Challenge requires exactly ${ULTIMATE_QUESTION_COUNT} questions.`,
    );
  return {
    queue: Array.from({ length: size }, (_, i) => i),
    cleared: [],
    attempts: 0,
  };
}

export function questionsForUltimatePack(
  pack: Pick<UltimatePack, "questions">,
): Question[] {
  const poolById = new Map<string, Question>();
  for (const question of pack.questions) poolById.set(question.id, question);
  const pool = [...poolById.values()];
  if (pool.length < ULTIMATE_QUESTION_COUNT)
    throw Error(
      `This topic needs ${ULTIMATE_QUESTION_COUNT} questions, but only ${pool.length} are available.`,
    );
  return shuffled(pool).slice(0, ULTIMATE_QUESTION_COUNT);
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
  return run.cleared.length * ULTIMATE_POINTS_PER_QUESTION;
}
