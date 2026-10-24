import { ultimatePacks } from "./ultimate-packs";
import { questionStem } from "./choices";

const descriptions: Record<
  string,
  { title: string; intro: string; icon: string }
> = {
  "major-museums": {
    title: "A world of museums",
    intro:
      "Connect a museum with its home city. Start with a few pairs, then try recalling them without a hint.",
    icon: "museum",
  },
  "on-a-stamp": {
    title: "People worth remembering",
    intro:
      "Meet women honored on U.S. stamps. Connect each person with the achievement that made her part of history.",
    icon: "history",
  },
  "presidential-before-after": {
    title: "Who came next?",
    intro:
      "Build a timeline of U.S. presidents. Linking one presidency to the next gives you more ways to remember.",
    icon: "history",
  },
  "spelling-number": {
    title: "Numbers, by the letter",
    intro:
      "Spell out the number, count its letters, then say the count. Spaces and hyphens do not count.",
    icon: "number",
  },
};
export const lessons = [...ultimatePacks]
  .sort((a, b) =>
    a.id === "major-museums" ? -1 : b.id === "major-museums" ? 1 : 0,
  )
  .map((p) => ({
    id: p.id,
    ...descriptions[p.id],
    subject: p.subjects[0],
    questions: p.questions,
  }));
export const learningQuestions = new Map(
  lessons.flatMap((l) => l.questions.map((q) => [q.id, q] as const)),
);
export function explanationFor(id: string) {
  const q = learningQuestions.get(id);
  if (!q) return "";
  if (q.subcategory === "Major Museums")
    return `${q.answer} is the home city. Keep the pair together: ${questionStem(
      q.text,
    )
      .replace(/^In which city is /, "")
      .replace(
        /\?$/,
        "",
      )} → ${q.answer}. Try reversing the connection when you review.`;
  if (q.subcategory === "Spelling Number")
    return `Count only the letters in the number’s name. The total is ${q.answer}. Breaking longer names into separate words makes them easier to count.`;
  return `${questionStem(q.text)} ${q.answer}. Build the connection between the clue and this name, then try recalling it again later.`;
}
