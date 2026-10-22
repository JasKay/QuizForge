import type { Question } from "./questions";
export type UltimatePack = {
  id: string;
  title: string;
  description: string;
  subjects: string[];
  questions: Question[];
};
const definitions = [
  {
    id: "solar-system",
    title: "Science & Nature",
    description: "Life, matter, and the natural world.",
    subjects: ["Science", "Mathematics", "Animals & Nature", "Engineering & Transport"],
    subject: "Science",
    source: "https://science.nasa.gov/solar-system/",
    rows: [
      [
        "Which planet is closest to the Sun?",
        "Mercury",
        ["Venus", "Earth", "Mars"],
        "mercury",
      ],
      [
        "Which planet has the highest average surface temperature?",
        "Venus",
        ["Mercury", "Mars", "Jupiter"],
        "venus",
      ],
      [
        "Which planet is the largest in our solar system?",
        "Jupiter",
        ["Saturn", "Neptune", "Earth"],
        "jupiter",
      ],
      [
        "Which planet is famous for its Great Red Spot?",
        "Jupiter",
        ["Mars", "Saturn", "Uranus"],
        "jupiter",
      ],
      [
        "Which planet is known as the Red Planet?",
        "Mars",
        ["Venus", "Mercury", "Neptune"],
        "mars",
      ],
      [
        "Which planet has the most prominent ring system visible from Earth?",
        "Saturn",
        ["Mars", "Venus", "Mercury"],
        "saturn",
      ],
      [
        "Which planet rotates on its side, with an axial tilt of about 98 degrees?",
        "Uranus",
        ["Jupiter", "Earth", "Venus"],
        "uranus",
      ],
      [
        "Which major planet is farthest from the Sun?",
        "Neptune",
        ["Uranus", "Saturn", "Jupiter"],
        "neptune",
      ],
      [
        "What is the name of Earth's natural satellite?",
        "The Moon",
        ["Titan", "Europa", "Phobos"],
        "moon",
      ],
      [
        "Which star is at the center of our solar system?",
        "The Sun",
        ["Sirius", "Polaris", "Proxima Centauri"],
        "sun",
      ],
    ],
  },
  {
    id: "element-symbols",
    title: "Science & Technology",
    description: "Scientific ideas, engineering, and invention.",
    subjects: ["Science", "Mathematics", "Technology", "Engineering & Transport"],
    subject: "Science",
    source: "https://periodic-table.rsc.org/",
    rows: [
      [
        "Which element has the symbol H?",
        "Hydrogen",
        ["Helium", "Hafnium", "Holmium"],
        "1/hydrogen",
      ],
      [
        "Which element has the symbol He?",
        "Helium",
        ["Hydrogen", "Hafnium", "Mercury"],
        "2/helium",
      ],
      [
        "Which element has the symbol C?",
        "Carbon",
        ["Calcium", "Cobalt", "Copper"],
        "6/carbon",
      ],
      [
        "Which element has the symbol O?",
        "Oxygen",
        ["Osmium", "Gold", "Oganesson"],
        "8/oxygen",
      ],
      [
        "Which element has the symbol Na?",
        "Sodium",
        ["Nitrogen", "Neon", "Nickel"],
        "11/sodium",
      ],
      [
        "Which element has the symbol K?",
        "Potassium",
        ["Krypton", "Calcium", "Carbon"],
        "19/potassium",
      ],
      [
        "Which element has the symbol Fe?",
        "Iron",
        ["Fluorine", "Francium", "Fermium"],
        "26/iron",
      ],
      [
        "Which element has the symbol Cu?",
        "Copper",
        ["Carbon", "Curium", "Calcium"],
        "29/copper",
      ],
      [
        "Which element has the symbol Ag?",
        "Silver",
        ["Gold", "Argon", "Aluminium"],
        "47/silver",
      ],
      [
        "Which element has the symbol Au?",
        "Gold",
        ["Silver", "Argon", "Astatine"],
        "79/gold",
      ],
    ],
  },
  {
    id: "shakespeare",
    title: "Literature & Arts",
    description: "Books, plays, performance, and creative expression.",
    subjects: ["Literature", "Theatre", "Arts", "General Knowledge"],
    subject: "Literature",
    source: "https://www.folger.edu/explore/shakespeares-works/",
    rows: [
      [
        "Which play features a prince of Denmark whose father appears as a ghost?",
        "Hamlet",
        ["Macbeth", "Othello", "King Lear"],
        "hamlet",
      ],
      [
        "In which play does Iago manipulate the title character?",
        "Othello",
        ["Hamlet", "Julius Caesar", "The Tempest"],
        "othello",
      ],
      [
        "Which play follows a Scottish nobleman who murders King Duncan?",
        "Macbeth",
        ["Richard II", "King Lear", "Henry V"],
        "macbeth",
      ],
      [
        "Which play includes the fairy Puck and a king named Oberon?",
        "A Midsummer Night's Dream",
        ["As You Like It", "Twelfth Night", "The Winter's Tale"],
        "a-midsummer-nights-dream",
      ],
      [
        "Which play features the moneylender Shylock?",
        "The Merchant of Venice",
        [
          "The Comedy of Errors",
          "Measure for Measure",
          "Much Ado About Nothing",
        ],
        "the-merchant-of-venice",
      ],
      [
        "In which play does Prospero command the spirit Ariel?",
        "The Tempest",
        ["Hamlet", "Macbeth", "Cymbeline"],
        "the-tempest",
      ],
      [
        "Which comedy features the twins Viola and Sebastian?",
        "Twelfth Night",
        [
          "As You Like It",
          "The Taming of the Shrew",
          "The Merry Wives of Windsor",
        ],
        "twelfth-night",
      ],
      [
        "Which play features the daughters Goneril, Regan and Cordelia?",
        "King Lear",
        ["Hamlet", "Othello", "Richard III"],
        "king-lear",
      ],
      [
        "Which play centers on lovers from the Montague and Capulet families?",
        "Romeo and Juliet",
        [
          "Antony and Cleopatra",
          "Troilus and Cressida",
          "Much Ado About Nothing",
        ],
        "romeo-and-juliet",
      ],
      [
        "Which play features Leontes, king of Sicilia, and his wife Hermione?",
        "The Winter's Tale",
        ["The Tempest", "Cymbeline", "Pericles"],
        "the-winters-tale",
      ],
    ],
  },
  {
    id: "plane-geometry",
    title: "Mathematics & Engineering",
    description: "Numbers, shapes, and how things work.",
    subjects: ["Mathematics", "Science", "Engineering & Transport", "Technology"],
    subject: "Mathematics",
    source: "https://mathworld.wolfram.com/",
    rows: [
      [
        "How many sides does a pentagon have?",
        "5",
        ["4", "6", "8"],
        "Pentagon",
      ],
      ["How many sides does a hexagon have?", "6", ["5", "7", "8"], "Hexagon"],
      [
        "How many degrees are in a right angle?",
        "90",
        ["45", "180", "360"],
        "RightAngle",
      ],
      [
        "What is the interior-angle sum of a Euclidean triangle, in degrees?",
        "180",
        ["90", "270", "360"],
        "Triangle",
      ],
      [
        "What is the interior-angle sum of a convex quadrilateral, in degrees?",
        "360",
        ["180", "270", "540"],
        "Quadrilateral",
      ],
      [
        "What is the area of a square with side length 4?",
        "16",
        ["8", "12", "20"],
        "Square",
      ],
      [
        "What is the perimeter of a rectangle with sides 3 and 5?",
        "16",
        ["8", "15", "30"],
        "Rectangle",
      ],
      [
        "What is the hypotenuse of a right triangle with legs 3 and 4?",
        "5",
        ["6", "7", "12"],
        "PythagoreanTheorem",
      ],
      [
        "A circle has radius 7. What is its diameter?",
        "14",
        ["7", "21", "49"],
        "Circle",
      ],
      [
        "How many degrees are in each interior angle of a regular hexagon?",
        "120",
        ["60", "90", "135"],
        "Hexagon",
      ],
    ],
  },
  {
    id: "games-computing",
    title: "Games & Computing",
    description: "Video games, computers and digital culture.",
    subject: "Games & Computing",
    subjects: ["Games & Computing", "Technology"],
    source: "https://opentdb.com/",
    rows: [],
  },
  {
    id: "film-television",
    title: "Film & Television",
    description: "Screen stories, performers and television.",
    subject: "Film & Television",
    subjects: ["Film & Television"],
    source: "https://opentdb.com/",
    rows: [],
  },
  {
    id: "music",
    title: "Music",
    description: "Songs, artists and music history.",
    subject: "Music",
    subjects: ["Music"],
    source: "https://opentdb.com/",
    rows: [],
  },
  {
    id: "comics-animation",
    title: "Comics & Animation",
    description: "Comics, animated stories and their characters.",
    subject: "Comics & Animation",
    subjects: ["Comics & Animation"],
    source: "https://opentdb.com/",
    rows: [],
  },
  {
    id: "history-geography",
    title: "History & Geography",
    description: "People, places and events that shaped the world.",
    subject: "History",
    subjects: [
      "History",
      "Geography",
      "Government & Civics",
      "African American History",
      "HBCU History",
    ],
    source: "https://opentdb.com/",
    rows: [],
  },
  {
    id: "sports-general",
    title: "Sports & General Knowledge",
    description: "Sports, culture and useful facts from everyday life.",
    subject: "Sports",
    subjects: ["Sports", "General Knowledge", "Popular Culture"],
    source: "https://opentdb.com/",
    rows: [],
  },
];
export const ultimatePacks: UltimatePack[] = definitions.map((p, pi) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  subjects: p.subjects,
  questions: p.rows.map((row, qi) => {
    const [text, answer, wrong, slug] = row as [
      string,
      string,
      string[],
      string,
    ];
    const source =
      p.id === "solar-system"
        ? "https://science.nasa.gov/" + slug + "/facts/"
        : p.id === "element-symbols"
          ? "https://periodic-table.rsc.org/element/" + slug
          : p.id === "shakespeare"
            ? p.source + slug + "/"
            : p.source + slug + ".html";
    return {
      id:
        "10000000-0000-4000-8000-" +
        String(pi * 100 + qi + 1).padStart(12, "0"),
      text: text + " Choices: " + [answer, ...wrong].join(" · "),
      answer,
      alternatives: [],
      explanation: text + " Answer: " + answer + ".",
      subject: p.subject,
      subcategory: p.title,
      difficulty: "Medium" as const,
      source,
      tags: ["original", "ultimate", p.id],
      format: "multiple_choice",
      review_status: "approved",
    };
  }),
}));
