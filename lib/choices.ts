import { normalize } from "./scoring";
type Item = {
  id: string;
  text: string;
  answer: string;
  alternatives?: string[];
  subject: string;
};
const curated: Record<number, string[]> = {
  1: ["Sumerians", "Phoenicians", "Romans", "Maya"],
  2: ["Jane Austen", "Charlotte Brontë", "George Eliot", "Mary Shelley"],
  3: ["Iron", "Fluorine", "Francium", "Fermium"],
  4: ["180", "90", "270", "360"],
  5: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"],
  6: ["5", "6", "7", "11"],
  7: ["Mae Jemison", "Sally Ride", "Valentina Tereshkova", "Katherine Johnson"],
  8: ["Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Salvador Dalí"],
  9: [
    "United Nations Educational Scientific and Cultural Organization",
    "United Nations Economic Social and Cultural Organization",
    "United Nations Education Security and Cooperation Organization",
    "United Nations Environmental Scientific and Cultural Organization",
  ],
  10: ["Mitochondrion", "Nucleus", "Ribosome", "Golgi apparatus"],
  11: ["Chinua Achebe", "Wole Soyinka", "Ngũgĩ wa Thiong’o", "Ben Okri"],
  12: ["13th Amendment", "14th Amendment", "15th Amendment", "19th Amendment"],
  13: [
    "Cheyney University",
    "Howard University",
    "Lincoln University",
    "Wilberforce University",
  ],
  14: ["1867", "1837", "1854", "1881"],
  15: [
    "Spelman College",
    "Morehouse College",
    "Clark College",
    "Morris Brown College",
  ],
  16: ["1891", "1867", "1881", "1901"],
  17: [
    "Cheyney University",
    "Howard University",
    "Hampton University",
    "Tuskegee University",
  ],
  18: [
    "Friendship Baptist Church",
    "Ebenezer Baptist Church",
    "Big Bethel AME Church",
    "First Congregational Church",
  ],
};
export function questionStem(text: string) {
  return text.split(" Choices: ")[0];
}
function hash(s: string) {
  let n = 2166136261;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function choicesForQuestion(
  q: Item,
  pool: readonly Pick<Item, "answer" | "subject">[],
) {
  const supplied = q.text.includes(" Choices: ")
    ? q.text.slice(q.text.lastIndexOf(" Choices: ") + 10).split(" · ")
    : [];
  const index = q.id.startsWith("00000000-0000-4000-8000-")
    ? Number(q.id.slice(-12))
    : 0;
  const candidates =
    supplied.length === 4
      ? supplied
      : curated[index] || [
          q.answer,
          ...pool.filter((v) => v.subject === q.subject).map((v) => v.answer),
          ...pool.map((v) => v.answer),
        ];
  const accepted = new Set(
      [q.answer, ...(q.alternatives || [])].map(normalize),
    ),
    seen = new Set<string>();
  const wrong = candidates
    .filter((v) => {
      const n = normalize(v);
      if (!n || accepted.has(n) || seen.has(n)) return false;
      seen.add(n);
      return true;
    })
    .slice(0, 3);
  if (wrong.length < 3)
    throw Error("This question needs three distinct answer choices.");
  return [q.answer, ...wrong].sort(
    (a, b) => hash(q.id + "|" + a) - hash(q.id + "|" + b),
  );
}
