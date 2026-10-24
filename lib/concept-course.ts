import type { Question } from "./questions";
type Teaching = {
  heading: string;
  connection: string;
  hint: string;
  cue: string;
  example?: string;
  diagram?: { parts: number; filled: number };
};
const concepts = [
  {
    id: "equal-parts",
    heading: "Equal parts make a fraction",
    connection: "The bottom number counts all equal parts.",
    hint: "The top number counts the parts you have. A fraction only describes equal-sized parts of the same whole.",
    example: "A bar has 4 equal pieces. Take 1 piece: you have 1/4.",
    diagram: { parts: 4, filled: 1 },
    question:
      "A cake has 6 equal slices. You take 2. What fraction of the cake is yours?",
    answer: "2/6",
    choices: ["2/6", "6/2", "2/4", "1/2"],
    transfer:
      "A ribbon is cut into 8 equal pieces. You keep 3. What fraction do you keep?",
    transferAnswer: "3/8",
    transferChoices: ["3/8", "8/3", "3/5", "1/3"],
  },
  {
    id: "equivalent",
    heading: "Different numbers. Same amount.",
    connection: "Multiply the top and bottom by the same number.",
    hint: "You change the size of the pieces and how many you count together. The share of the whole stays the same.",
    example: "1/2 = 2/4. Each half becomes two smaller pieces.",
    diagram: { parts: 4, filled: 2 },
    question:
      "Multiply the top and bottom of 1/3 by 2. What equivalent fraction do you get?",
    answer: "2/6",
    choices: ["2/6", "2/3", "1/6", "3/5"],
    transfer:
      "Multiply the top and bottom of 2/5 by 3. What equivalent fraction do you get?",
    transferAnswer: "6/15",
    transferChoices: ["6/15", "6/5", "2/15", "5/8"],
  },
  {
    id: "compare",
    heading: "Same-sized pieces are easy to compare",
    connection: "Same bottom number? Compare the top numbers.",
    hint: "With equal-sized wholes and the same denominator, each piece is the same size. More pieces means a larger fraction.",
    example: "3/8 is greater than 1/8: three eighths is more than one eighth.",
    diagram: { parts: 8, filled: 3 },
    question: "Which fraction is greater: 2/7 or 5/7?",
    answer: "5/7",
    choices: ["5/7", "2/7", "They are equal", "Cannot compare"],
    transfer:
      "Two equal-sized pizzas are cut into 9 slices each. Which is more pizza: 4/9 or 7/9?",
    transferAnswer: "7/9",
    transferChoices: ["7/9", "4/9", "They are equal", "Cannot compare"],
  },
];
export const conceptTeaching = new Map<string, Teaching>();
export const conceptChoices = new Map<string, string[]>();
export const conceptTransfers = new Map<string, string>();
function question(
  id: string,
  text: string,
  answer: string,
  explanation: string,
): Question {
  return {
    id,
    text,
    answer,
    alternatives: [],
    explanation,
    subject: "Mathematics",
    subcategory: "Fraction foundations",
    difficulty: "Easy",
    source: "https://mathworld.wolfram.com/Fraction.html",
    tags: ["concept", "fractions"],
    format: "short_answer",
    review_status: "reviewed",
  };
}
export const conceptQuestions = concepts.flatMap((c) => {
  const id = "learn-fractions-" + c.id,
    transferId = id + "-apply";
  const teaching = {
    heading: c.heading,
    connection: c.connection,
    hint: c.hint,
    cue: "FRACTION FOUNDATIONS",
    example: c.example,
    diagram: c.diagram,
  };
  conceptTeaching.set(id, teaching);
  conceptTeaching.set(transferId, teaching);
  conceptChoices.set(id, c.choices);
  conceptChoices.set(transferId, c.transferChoices);
  conceptTransfers.set(id, transferId);
  return [
    question(id, c.question, c.answer, c.hint + " " + c.example),
    question(transferId, c.transfer, c.transferAnswer, c.hint),
  ];
});
export const conceptCourse = {
  id: "fraction-foundations",
  title: "Fractions, made simple",
  intro:
    "Understand equal parts, equivalent fractions, and how to compare them. Then use each idea in a new situation.",
  icon: "number",
  subject: "Mathematics",
  questions: conceptQuestions,
};
