import { ultimatePacks } from "./ultimate-packs";
import community from "./community-questions.json";
export type Question = {
  id: string;
  text: string;
  answer: string;
  alternatives: string[];
  explanation: string;
  subject: string;
  subcategory: string;
  difficulty: "Easy" | "Medium" | "Hard";
  source: string;
  tags: string[];
  format: string;
  review_status: string;
};
const originalSubjects = [
  "History",
  "Literature",
  "Science",
  "Mathematics",
  "Geography",
  "Sports",
  "African American History",
  "Arts",
  "General Knowledge",
];
const rows = [
  [
    "History",
    "Which ancient civilization developed cuneiform writing?",
    "Sumerians",
    "Sumerian|Sumer",
    "Early cuneiform tablets recorded economic transactions; scribes pressed wedge-shaped marks into clay before the script developed literary uses.",
    "https://www.loc.gov/collections/cuneiform-tablets/about-this-collection/",
  ],
  [
    "Literature",
    "Who wrote the novel Pride and Prejudice?",
    "Jane Austen",
    "Austen",
    "Originally titled First Impressions, the novel explores marriage, class and the dangers of judging character too quickly through Elizabeth Bennet's relationship with Darcy.",
    "https://www.bl.uk/stories/blogs/posts/jane-austen-at-250",
  ],
  [
    "Science",
    "What chemical element has the symbol Fe?",
    "Iron",
    "",
    "Fe comes from ferrum, the Latin name for iron. Iron has atomic number 26.",
    "https://pubchem.ncbi.nlm.nih.gov/element/Fe",
  ],
  [
    "Mathematics",
    "What is the sum of the interior angles of a triangle in Euclidean geometry, in degrees?",
    "180",
    "180 degrees",
    "Draw a line through one vertex parallel to the opposite side: alternate interior angles show that the three angles form a straight angle. This rule need not hold on curved surfaces.",
    "https://mathworld.wolfram.com/Triangle.html",
  ],
  [
    "Geography",
    "Which ocean is the largest by surface area?",
    "Pacific Ocean",
    "Pacific|The Pacific Ocean",
    "The Pacific Ocean is the largest and deepest ocean basin.",
    "https://oceanservice.noaa.gov/facts/biggestocean.html",
  ],
  [
    "Sports",
    "How many players from one team are on the court during standard basketball play?",
    "5",
    "Five",
    "Standard basketball uses five players per side, unlike the three-a-side half-court format of FIBA 3x3.",
    "https://about.fiba.basketball/en/our-sport/basketball",
  ],
  [
    "African American History",
    "Who became the first African American woman to travel into space, in 1992?",
    "Mae Jemison",
    "Jemison|Mae C Jemison",
    "Mae Jemison flew aboard Space Shuttle Endeavour on mission STS-47 in September 1992.",
    "https://www.nasa.gov/former-astronaut-mae-c-jemison/",
  ],
  [
    "Arts",
    "Which artist painted The Starry Night in 1889?",
    "Vincent van Gogh",
    "Van Gogh",
    "Van Gogh painted this work while staying at Saint-Remy in southern France.",
    "https://www.moma.org/collection/works/79802",
  ],
  [
    "General Knowledge",
    "What does the abbreviation UNESCO stand for?",
    "United Nations Educational Scientific and Cultural Organization",
    "United Nations Educational Scientific and Cultural Organisation",
    "UNESCO promotes international cooperation in education, science, culture and communication.",
    "https://www.unesco.org/en/brief",
  ],
  [
    "Science",
    "Which organelle is the main site of aerobic cellular respiration in eukaryotic cells?",
    "Mitochondrion",
    "Mitochondria",
    "Mitochondria produce most cellular ATP through aerobic respiration.",
    "https://www.genome.gov/genetics-glossary/Mitochondria",
  ],
  [
    "Literature",
    "Who wrote Things Fall Apart?",
    "Chinua Achebe",
    "Achebe",
    "Published in 1958, Things Fall Apart follows Okonkwo and the changes affecting an Igbo community.",
    "https://www.loc.gov/loc/lcib/0812/achebe.html",
  ],
  [
    "African American History",
    "Which amendment to the U.S. Constitution abolished slavery, except as punishment for a crime?",
    "13th Amendment",
    "13|Thirteenth Amendment|13th",
    "Ratified in December 1865, it abolished slavery nationwide subject to its punishment exception, extending abolition beyond the wartime Emancipation Proclamation.",
    "https://www.archives.gov/milestone-documents/13th-amendment",
  ],
];
rows.push(
  [
    "HBCU History",
    "Which Pennsylvania university, founded in 1837, is the oldest HBCU in the United States?",
    "Cheyney University",
    "Cheyney|Cheyney University of Pennsylvania",
    "The school originated in a bequest from Quaker philanthropist Richard Humphreys to support education for Black Americans.",
    "https://cheyney.edu/for-parents/history-traditions/",
  ],
  [
    "HBCU History",
    "In what year was Howard University chartered by Congress?",
    "1867",
    "",
    "Howard was named for Union general Oliver Otis Howard, who led the Freedmen's Bureau during Reconstruction.",
    "https://secretary.howard.edu/about",
  ],
  [
    "HBCU History",
    "Which Atlanta college began as the Atlanta Baptist Female Seminary in 1881?",
    "Spelman College",
    "Spelman",
    "Sophia Packard and Harriet Giles founded the school that became Spelman.",
    "https://www.spelman.edu/about/history-in-brief.html",
  ],
  [
    "HBCU History",
    "In what year was North Carolina A&T founded?",
    "1891",
    "",
    "North Carolina A&T began as a land-grant institution; its students later played a pivotal role in the 1960 Greensboro sit-ins.",
    "https://www.ncat.edu/installation/history.php",
  ],
  [
    "HBCU History",
    "Which university was founded through the bequest of Richard Humphreys in 1837?",
    "Cheyney University",
    "Cheyney|Cheyney University of Pennsylvania",
    "Humphreys was a Quaker philanthropist whose bequest supported education for Black Americans in the decades before emancipation.",
    "https://cheyney.edu/for-parents/history-traditions/",
  ],
  [
    "HBCU History",
    "Spelman College opened in the basement of which Atlanta church in 1881?",
    "Friendship Baptist Church",
    "Friendship Baptist|Friendship",
    "The school was founded by Sophia Packard and Harriet Giles and later named in honour of the family of Laura Spelman Rockefeller.",
    "https://www.spelman.edu/about/history-in-brief.html",
  ],
);
const originalDistractors: string[][] = [["Akkadians","Egyptians","Hittites"],["Charlotte Brontë","George Eliot","Mary Shelley"],["Fluorine","Francium","Fermium"],["90","270","360"],["Atlantic Ocean","Indian Ocean","Southern Ocean"],["4","6","7"],["Judith Resnik","Sally Ride","Kathryn Sullivan"],["Claude Monet","Paul Cézanne","Paul Gauguin"],[],["Nucleus","Ribosome","Golgi apparatus"],["Wole Soyinka","Ngũgĩ wa Thiong'o","Chimamanda Ngozi Adichie"],["14th Amendment","15th Amendment","16th Amendment"],["Lincoln University","Howard University","Wilberforce University"],["1857","1877","1887"],["Bennett College","Clark Atlanta University","Morris Brown College"],["1881","1901","1911"],["Lincoln University","Fisk University","Hampton University"],["Ebenezer Baptist Church","Big Bethel AME Church","Wheat Street Baptist Church"]];
const originalQuestions: Question[] = rows.map((r, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  subject: r[0],
  text: originalDistractors[i]?.length === 3 ? `${r[1]} Choices: ${[r[2], ...originalDistractors[i]].sort((a,b) => a.localeCompare(b)).join(" · ")}` : r[1],
  answer: r[2],
  alternatives: r[3] ? r[3].split("|") : [],
  explanation: r[4],
  source: r[5],
  subcategory: r[0],
  difficulty: i > 8 ? "Medium" : "Easy",
  tags: ["original", "practice"],
  format: "short_answer",
  review_status: "approved",
}));

export const questions: Question[] = [
  ...originalQuestions,
  ...(community as Question[]),
  ...ultimatePacks.flatMap((p) => p.questions),
];
export const subjects = [
  ...new Set([...originalSubjects, ...questions.map((q) => q.subject)]),
];
