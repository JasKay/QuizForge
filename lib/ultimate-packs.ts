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
  rows: [string, string, string[]?, string?, string?, string[]?][];
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
    description: "Identify museum cities through landmark artworks, collections and history.",
    subject: "Arts",
    source: "https://www.louvre.fr/en",
    rows: [
  [
    "Which city is home to the Louvre, where a former royal palace became a public museum in 1793?",
    "Paris",
    [],
    "https://www.louvre.fr/en",
    "The Louvre began as a medieval fortress before becoming a royal residence. It opened as a public museum during the French Revolution.",
    [
      "Lyon",
      "Brussels",
      "Vienna"
    ]
  ],
  [
    "Which city houses the British Museum's Rosetta Stone, the multilingual inscription that helped decipher Egyptian hieroglyphs?",
    "London",
    [],
    "https://www.britishmuseum.org/collection/object/Y_EA24",
    "The stone records a decree in Greek, Demotic and hieroglyphic scripts. Comparing these texts helped scholars decipher ancient Egyptian writing.",
    [
      "Oxford",
      "Edinburgh",
      "Dublin"
    ]
  ],
  [
    "In which city can visitors see Velázquez's Las Meninas at the Prado?",
    "Madrid",
    [],
    "https://www.museodelprado.es/en",
    "Painted in 1656, Las Meninas depicts the Spanish royal household and plays with perspective, including a reflection of the king and queen.",
    [
      "Barcelona",
      "Seville",
      "Lisbon"
    ]
  ],
  [
    "Which city houses Botticelli's Birth of Venus in the Uffizi Gallery?",
    "Florence",
    [
      "Firenze"
    ],
    "https://www.uffizi.it/en/the-uffizi",
    "The Uffizi originated as offices for the Medici administration; its collection reflects the family's patronage of Renaissance art.",
    [
      "Rome",
      "Venice",
      "Milan"
    ]
  ],
  [
    "Which city houses Rembrandt's The Night Watch in the Rijksmuseum?",
    "Amsterdam",
    [],
    "https://www.rijksmuseum.nl/en",
    "The 1642 painting depicts a civic militia company. Its dramatic lighting and sense of movement distinguish it from conventional group portraits.",
    [
      "Rotterdam",
      "The Hague",
      "Antwerp"
    ]
  ],
  [
    "Which city houses the reconstructed Temple of Dendur in the Metropolitan Museum of Art?",
    "New York",
    [
      "New York City"
    ],
    "https://www.metmuseum.org/",
    "Egypt gave the Roman-era temple to the United States in recognition of assistance in saving monuments threatened by the Aswan High Dam.",
    [
      "Boston",
      "Philadelphia",
      "Washington, D.C."
    ]
  ],
  [
    "In which US city is Georges Seurat's A Sunday on La Grande Jatte displayed?",
    "Chicago",
    [],
    "https://www.artic.edu/",
    "Seurat used small touches of colour to create optical mixtures in this landmark Neo-Impressionist painting, held by the Art Institute.",
    [
      "Detroit",
      "Cleveland",
      "Minneapolis"
    ]
  ],
  [
    "Which city houses the museum with a glass-walled Parthenon Gallery aligned with the ancient temple?",
    "Athens",
    [],
    "https://www.theacropolismuseum.gr/en",
    "The Acropolis Museum displays architectural sculptures in a gallery designed to echo the Parthenon's orientation and proportions.",
    [
      "Thessaloniki",
      "Rome",
      "Istanbul"
    ]
  ],
  [
    "In which city is the historic Egyptian Museum on Tahrir Square?",
    "Cairo",
    [],
    "https://egyptianmuseumcairo.eg/",
    "The museum opened in its Tahrir Square building in 1902, decades before the development of the Grand Egyptian Museum near Giza.",
    [
      "Alexandria",
      "Luxor",
      "Aswan"
    ]
  ],
  [
    "Which city houses the Hermitage's Winter Palace, formerly a residence of Russian emperors?",
    "Saint Petersburg",
    [
      "St Petersburg",
      "Petersburg"
    ],
    "https://www.hermitagemuseum.org/",
    "Catherine the Great began the imperial art collection in 1764. The Winter Palace later became a central part of the Hermitage museum complex.",
    [
      "Moscow",
      "Kazan",
      "Helsinki"
    ]
  ]
],
  },
  {
    id: "africa-across-the-map",
    title: "Across Africa",
    description: "Ten quick-fire questions on African geography and history.",
    subject: "Geography",
    source: "https://www.britannica.com/place/Africa",
    rows: [
      ["What is the capital of Ghana?", "Accra"],
      ["Which river flows through Egypt into the Mediterranean?", "Nile"],
      ["What is the capital of Senegal?", "Dakar"],
      ["Which country surrounds Lesotho?", "South Africa"],
      ["What is the capital of Kenya?", "Nairobi"],
      ["Which desert stretches across North Africa?", "Sahara"],
      ["Which country has Addis Ababa as its capital?", "Ethiopia"],
      ["Which lake borders Uganda, Kenya and Tanzania?", "Lake Victoria", ["Victoria"]],
      ["Which ocean borders Mozambique to the east?", "Indian Ocean"],
      ["Which country has Kigali as its capital?", "Rwanda"],
    ],
  },
  {
    id: "science-in-ten",
    title: "Science in Ten",
    description: "Ten rapid questions spanning biology, chemistry and physics.",
    subject: "Science",
    source: "https://www.britannica.com/science",
    rows: [
      ["What is the chemical symbol for potassium?", "K"],
      ["What is the SI unit of electric current?", "Ampere", ["Amp"]],
      ["Which planet has the largest diameter in our solar system?", "Jupiter"],
      ["What is the chemical symbol for silver?", "Ag"],
      ["What part of a cell contains most of its genetic material?", "Nucleus"],
      ["What is the SI unit of frequency?", "Hertz"],
      ["Which gas has the chemical formula CO2?", "Carbon dioxide"],
      ["What is the common name for sodium chloride?", "Salt", ["Table salt"]],
      ["What is the SI unit of electrical resistance?", "Ohm"],
      ["What is the name of the process by which plants make sugars using light?", "Photosynthesis"],
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
      [text, answer, alternatives = [], source = theme.source, explanation, choices],
      qi,
    ): Question => ({
      id:
        "20000000-0000-4000-8000-" +
        String(pi * 100 + qi + 1).padStart(12, "0"),
      text: choices ? `${text} Choices: ${[answer, ...choices].sort((a, b) => a.localeCompare(b)).join(" · ")}` : text,
      answer,
      alternatives,
      explanation: explanation || `${text} Answer: ${answer}.`,
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
