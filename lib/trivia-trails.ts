import { questions, type Question } from "./questions";
import { ultimatePacks } from "./ultimate-packs";
export type TriviaTrail = {
  id: string;
  title: string;
  intro: string;
  icon: string;
  subject: string;
  questions: Question[];
  related: string[];
};
const editorial: Record<
  string,
  { title: string; intro: string; icon: string }
> = {
  Geography: {
    title: "Around the world",
    intro: "Countries, cities, landmarks. Follow one place to the next.",
    icon: "globe",
  },
  Science: {
    title: "How the world works",
    intro: "Space, discoveries, and the science hiding in everyday life.",
    icon: "science",
  },
  History: {
    title: "People who changed things",
    intro: "Big moments, unexpected people, and what came next.",
    icon: "history",
  },
  Literature: {
    title: "Between the lines",
    intro: "Books, writers, and the worlds they created.",
    icon: "book",
  },
  Arts: {
    title: "The art of noticing",
    intro: "Paintings, museums, and the people behind them.",
    icon: "art",
  },
  Music: {
    title: "Know the soundtrack",
    intro: "Artists, songs, and the stories behind the music.",
    icon: "music",
  },
  "Film & Television": {
    title: "On the big screen",
    intro: "Films, favourite characters, and unforgettable performances.",
    icon: "film",
  },
  "African American History": {
    title: "History worth knowing",
    intro: "Discover the people and milestones that shaped a nation.",
    icon: "history",
  },
  "HBCU History": {
    title: "Built for a legacy",
    intro: "The institutions, founders, and firsts of HBCU history.",
    icon: "history",
  },
};
const order = [
  "Geography",
  "Science",
  "History",
  "Literature",
  "Arts",
  "Music",
  "African American History",
  "HBCU History",
];
const subjects = [...new Set(questions.map((q) => q.subject))].sort(
  (a, b) =>
    (order.indexOf(a) < 0 ? 100 : order.indexOf(a)) -
    (order.indexOf(b) < 0 ? 100 : order.indexOf(b)),
);
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
const broad: TriviaTrail[] = subjects.map((subject) => ({
  id: "trail-" + slug(subject),
  title: editorial[subject]?.title || subject,
  intro:
    editorial[subject]?.intro ||
    `Follow the clues, discover the connections, and build your ${subject.toLowerCase()} knowledge.`,
  icon: editorial[subject]?.icon || "spark",
  subject,
  questions: questions.filter((q) => q.subject === subject),
  related: [],
}));
const themed: TriviaTrail[] = ultimatePacks.map((p) => ({
  id: p.id,
  title: p.title,
  intro: p.description,
  icon: p.id === "major-museums" ? "art" : "history",
  subject: p.subjects[0],
  questions: p.questions,
  related: [],
}));
const links: Record<string, string[]> = {
  Geography: ["major-museums", "trail-history", "trail-science"],
  Science: ["trail-animals-nature", "trail-technology", "trail-geography"],
  History: ["on-a-stamp", "presidential-before-after", "trail-hbcu-history"],
  Arts: ["major-museums", "trail-literature", "trail-film-television"],
  Literature: ["trail-mythology", "trail-theatre", "trail-history"],
  Music: ["trail-film-television", "trail-popular-culture", "trail-theatre"],
  "Games & Computing": [
    "trail-technology",
    "trail-comics-animation",
    "trail-popular-culture",
  ],
  Technology: [
    "trail-science",
    "trail-games-computing",
    "trail-engineering-transport",
  ],
  Mathematics: ["trail-science", "trail-technology", "spelling-number"],
  Sports: ["trail-geography", "trail-history", "trail-popular-culture"],
  "Film & Television": [
    "trail-literature",
    "trail-music",
    "trail-comics-animation",
  ],
  "Comics & Animation": [
    "trail-film-television",
    "trail-games-computing",
    "trail-mythology",
  ],
  "Animals & Nature": ["trail-science", "trail-geography", "trail-mythology"],
  "General Knowledge": ["trail-geography", "trail-history", "trail-science"],
  "Popular Culture": ["trail-music", "trail-film-television", "trail-sports"],
  "Government & Civics": [
    "trail-history",
    "presidential-before-after",
    "trail-geography",
  ],
  Theatre: ["trail-music", "trail-literature", "trail-film-television"],
  "Engineering & Transport": [
    "trail-technology",
    "trail-science",
    "trail-geography",
  ],
  Mythology: ["trail-literature", "trail-history", "trail-arts"],
  "African American History": [
    "trail-hbcu-history",
    "on-a-stamp",
    "trail-history",
  ],
  "HBCU History": [
    "trail-african-american-history",
    "trail-history",
    "trail-geography",
  ],
};
export const triviaTrails = [...broad, ...themed].map((t, _, all) => ({
  ...t,
  related: [
    ...new Set([
      ...(links[t.subject] || []),
      ...all
        .filter((other) => other.subject === t.subject && other.id !== t.id)
        .map((other) => other.id),
      ...broad.filter((other) => other.id !== t.id).map((other) => other.id),
    ]),
  ]
    .filter((id) => id !== t.id && all.some((other) => other.id === id))
    .slice(0, 4),
}));
export function chooseTrailQuestions(
  trail: TriviaTrail,
  progress: Map<string, { correct: boolean; at: number }>,
  limit = 5,
) {
  return [...trail.questions]
    .sort((a, b) => {
      const pa = progress.get(a.id),
        pb = progress.get(b.id);
      const rank = (p: typeof pa) => (!p ? 0 : p.correct ? 2 : 1);
      return rank(pa) - rank(pb) || (pa?.at || 0) - (pb?.at || 0);
    })
    .slice(0, limit);
}
