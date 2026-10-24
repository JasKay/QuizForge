import { conceptCourse, conceptTeaching } from "./concept-course";
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
const recallLessons = [...ultimatePacks]
  .sort((a, b) =>
    a.id === "major-museums" ? -1 : b.id === "major-museums" ? 1 : 0,
  )
  .map((p) => ({
    id: p.id,
    ...descriptions[p.id],
    subject: p.subjects[0],
    questions: p.questions,
  }));
export const lessons = [conceptCourse, ...recallLessons];
export const learningQuestions = new Map(
  lessons.flatMap((l) => l.questions.map((q) => [q.id, q] as const)),
);
export function explanationFor(id: string) {
  const q = learningQuestions.get(id);
  if (!q) return "";
  if (conceptTeaching.has(id)) return q.explanation;
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
export function teachingFor(id: string) {
  if (conceptTeaching.has(id)) return conceptTeaching.get(id)!;
  const q = learningQuestions.get(id);
  if (!q) return null;
  if (q.subcategory === "Major Museums") {
    const museum = questionStem(q.text)
      .replace(/^In which city is (?:the )?/, "")
      .replace(/\?$/, "");
    return {
      heading: museum,
      connection: q.answer,
      hint: `One museum, one home city. Picture the name ${museum} beside ${q.answer}.`,
      cue: "MUSEUM → CITY",
    };
  }
  if (q.subcategory === "Spelling Number") {
    const words = q.text.match(/in ([A-Z ]+)/)?.[1]?.trim() || "";
    const parts = words.split(" ").filter(Boolean);
    return {
      heading: words,
      connection: `${q.answer} letters`,
      hint:
        parts.map((w) => `${w} (${w.length})`).join(" + ") +
        ` = ${q.answer}. Spaces and hyphens do not count.`,
      cue: "SPELL IT. COUNT IT.",
    };
  }
  if (q.subcategory === "Presidential Before & Afters") {
    const reference = q.text
      .replace(/^.*?(?:after|before) /, "")
      .replace(/\?$/, "");
    const pair = q.text.includes("before")
      ? `${q.answer} → ${reference}`
      : `${reference} → ${q.answer}`;
    return {
      heading: pair.split(" → ")[0],
      connection: pair.split(" → ")[1],
      hint: "Read the arrow as “was followed by.” Keep the two names together, then try recalling the order.",
      cue: "PRESIDENTIAL TIMELINE",
    };
  }
  return {
    heading: q.answer,
    connection: questionStem(q.text)
      .replace(/^(Which|Who was|Who) /, "")
      .replace(/\?$/, ""),
    hint: "Connect the person with the achievement. Then try recalling the name from the clue alone.",
    cue: "PEOPLE WORTH REMEMBERING",
  };
}
