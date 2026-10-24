import { questions } from "./questions";
import { triviaTrails } from "./trivia-trails";
export const lessons = triviaTrails;
export const learningQuestions = new Map(
  questions.map((q) => [q.id, q] as const),
);
export function explanationFor(id: string) {
  return learningQuestions.get(id)?.explanation || "";
}
