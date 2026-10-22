import type { Question } from "./questions";
export type UltimatePack = {
  id: string;
  title: string;
  description: string;
  subjects: string[];
  questions: Question[];
};
type Theme = {
  id: string;
  title: string;
  description: string;
  subject: string;
  source: string;
  rows: [string, string, string[]?, string?][];
};
const themes: Theme[] = [
  {
    id: "on-a-stamp",
    title: "I'm on a Stamp",
    description:
      "Identify women honored on U.S. postage stamps from a short clue.",
    subject: "History",
    source:
      "https://about.usps.com/who/profile/history/women-stamp-subjects.htm",
    rows: [
      [
        "Which Underground Railroad conductor was known as Moses?",
        "Harriet Tubman",
        ["Tubman"],
      ],
      [
        "Which woman refused to give up her Montgomery bus seat in 1955?",
        "Rosa Parks",
        ["Parks"],
      ],
      ["Who was the first American woman in space?", "Sally Ride", ["Ride"]],
      [
        "Which pilot became the first woman to fly solo across the Atlantic?",
        "Amelia Earhart",
        ["Earhart"],
      ],
      [
        "Which poet wrote I Know Why the Caged Bird Sings?",
        "Maya Angelou",
        ["Angelou"],
      ],
      [
        "Which deafblind author wrote The Story of My Life?",
        "Helen Keller",
        ["Keller"],
      ],
      [
        "Which singer was known as the First Lady of Song?",
        "Ella Fitzgerald",
        ["Fitzgerald"],
      ],
      [
        "Which artist painted enlarged flowers and New Mexico landscapes?",
        "Georgia O'Keeffe",
        ["O'Keeffe", "Georgia O Keeffe"],
      ],
      [
        "Which abolitionist delivered the speech known as Ain't I a Woman?",
        "Sojourner Truth",
        ["Truth"],
      ],
      [
        "Which tennis champion won the 1957 and 1958 Wimbledon singles titles?",
        "Althea Gibson",
        ["Gibson"],
      ],
    ],
  },
  {
    id: "presidential-before-after",
    title: "Presidential Before & Afters",
    description:
      "Name the U.S. president immediately before or after another president.",
    subject: "History",
    source: "https://guides.loc.gov/presidents-portraits/chronological",
    rows: [
      [
        "Who became president immediately after George Washington?",
        "John Adams",
        ["Adams"],
      ],
      [
        "Who became president immediately after John Adams?",
        "Thomas Jefferson",
        ["Jefferson"],
      ],
      [
        "Who served immediately before James Monroe?",
        "James Madison",
        ["Madison"],
      ],
      [
        "Who became president immediately after Abraham Lincoln?",
        "Andrew Johnson",
        ["Johnson"],
      ],
      [
        "Who served immediately before Theodore Roosevelt?",
        "William McKinley",
        ["McKinley"],
      ],
      [
        "Who became president immediately after Woodrow Wilson?",
        "Warren Harding",
        ["Warren G. Harding", "Harding"],
      ],
      [
        "Who became president immediately after Franklin Roosevelt?",
        "Harry Truman",
        ["Harry S. Truman", "Truman"],
      ],
      [
        "Who served immediately before John F. Kennedy?",
        "Dwight Eisenhower",
        ["Dwight D. Eisenhower", "Eisenhower"],
      ],
      [
        "Who became president immediately after Richard Nixon?",
        "Gerald Ford",
        ["Ford"],
      ],
      [
        "Who served immediately before Barack Obama?",
        "George W. Bush",
        ["George Bush"],
      ],
    ],
  },
  {
    id: "spelling-number",
    title: "Spelling Number",
    description:
      "Say how many letters are in the spelled-out number. Ignore spaces and hyphens.",
    subject: "Mathematics",
    source: "https://www.merriam-webster.com/dictionary/number",
    rows: [
      ["How many letters are in ONE?", "3", ["three"]],
      ["How many letters are in FOUR?", "4", ["four"]],
      ["How many letters are in SEVEN?", "5", ["five"]],
      ["How many letters are in ELEVEN?", "6", ["six"]],
      ["How many letters are in FIFTEEN?", "7", ["seven"]],
      ["How many letters are in EIGHTEEN?", "8", ["eight"]],
      [
        "How many letters are in TWENTY ONE, ignoring the space?",
        "9",
        ["nine"],
      ],
      [
        "How many letters are in THIRTY FOUR, ignoring the space?",
        "10",
        ["ten"],
      ],
      [
        "How many letters are in SEVENTY FIVE, ignoring the space?",
        "11",
        ["eleven"],
      ],
      [
        "How many letters are in SEVENTY SEVEN, ignoring the space?",
        "12",
        ["twelve"],
      ],
    ],
  },
  {
    id: "major-museums",
    title: "Major Museums",
    description: "Name the city that is home to each famous museum.",
    subject: "Arts",
    source: "https://www.louvre.fr/en",
    rows: [
      ["In which city is the Louvre?", "Paris"],
      [
        "In which city is the British Museum?",
        "London",
        [],
        "https://www.britishmuseum.org/visit",
      ],
      [
        "In which city is the Prado?",
        "Madrid",
        [],
        "https://www.museodelprado.es/en/visit-the-museum",
      ],
      [
        "In which city is the Uffizi Gallery?",
        "Florence",
        ["Firenze"],
        "https://www.uffizi.it/en/the-uffizi",
      ],
      [
        "In which city is the Rijksmuseum?",
        "Amsterdam",
        [],
        "https://www.rijksmuseum.nl/en/visit",
      ],
      [
        "In which city is the Metropolitan Museum of Art?",
        "New York",
        ["New York City"],
        "https://www.metmuseum.org/plan-your-visit",
      ],
      [
        "In which city is the Art Institute of Chicago?",
        "Chicago",
        [],
        "https://www.artic.edu/visit",
      ],
      [
        "In which city is the Acropolis Museum?",
        "Athens",
        [],
        "https://www.theacropolismuseum.gr/en/plan-your-visit",
      ],
      [
        "In which city is the Egyptian Museum on Tahrir Square?",
        "Cairo",
        [],
        "https://egyptianmuseumcairo.eg/",
      ],
      [
        "In which city is the State Hermitage Museum?",
        "Saint Petersburg",
        ["St Petersburg", "Petersburg"],
        "https://www.hermitagemuseum.org/",
      ],
    ],
  },
];
export const ultimatePacks: UltimatePack[] = themes.map((theme, pi) => ({
  id: theme.id,
  title: theme.title,
  description: theme.description,
  subjects: [theme.subject],
  questions: theme.rows.map(
    (
      [text, answer, alternatives = [], source = theme.source],
      qi,
    ): Question => ({
      id:
        "20000000-0000-4000-8000-" +
        String(pi * 100 + qi + 1).padStart(12, "0"),
      text,
      answer,
      alternatives,
      explanation: `${text} Answer: ${answer}.`,
      subject: theme.subject,
      subcategory: theme.title,
      difficulty: "Medium",
      source,
      tags: ["original", "ultimate", theme.id],
      format: "short-answer",
      review_status: "approved",
    }),
  ),
}));
