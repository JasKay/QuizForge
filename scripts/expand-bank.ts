import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
// Open Trivia DB data is CC BY-SA 4.0; keep provenance on every imported item.
const path = "lib/community-questions.json";
const existing = JSON.parse(readFileSync(path, "utf8")) as Record<
  string,
  any
>[];
const seen = new Set(existing.map((q) => q.id));
const map: Record<string, string> = {
  "General Knowledge": "General Knowledge",
  "Entertainment: Books": "Literature",
  "Entertainment: Film": "Film & Television",
  "Entertainment: Music": "Music",
  "Entertainment: Musicals & Theatres": "Theatre",
  "Entertainment: Television": "Film & Television",
  "Entertainment: Video Games": "Games & Computing",
  "Entertainment: Board Games": "Games & Computing",
  "Science & Nature": "Science",
  "Science: Computers": "Technology",
  "Science: Mathematics": "Mathematics",
  Mythology: "Mythology",
  Sports: "Sports",
  Geography: "Geography",
  History: "History",
  Politics: "Government & Civics",
  Art: "Arts",
  Celebrities: "Popular Culture",
  Animals: "Animals & Nature",
  Vehicles: "Engineering & Transport",
  "Entertainment: Comics": "Comics & Animation",
  "Science: Gadgets": "Technology",
  "Entertainment: Japanese Anime & Manga": "Comics & Animation",
  "Entertainment: Cartoon & Animations": "Comics & Animation",
};
async function get(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw Error("Question source unavailable (" + res.status + ").");
  return res.json();
}
async function main() {
  const { token } = await get(
    "https://opentdb.com/api_token.php?command=request",
  );
  const batches = Math.min(30, Math.max(1, Number(process.argv[2] || 10)));
  for (let batch = 0; batch < batches; batch++) {
    if (batch > 0) await new Promise((r) => setTimeout(r, 5500));
    const data = await get(
      "https://opentdb.com/api.php?amount=50&type=multiple&encode=url3986&token=" +
        encodeURIComponent(token),
    );
    if (data.response_code !== 0) {
      console.log(
        "Source returned code",
        data.response_code,
        "; saved questions retained.",
      );
      break;
    }
    for (const row of data.results) {
      const decode = (v: string) => decodeURIComponent(v);
      const text = decode(row.question),
        answer = decode(row.correct_answer),
        cat = decode(row.category);
      const hash = createHash("sha256")
        .update(text.toLowerCase())
        .digest("hex");
      const id =
        hash.slice(0, 8) +
        "-" +
        hash.slice(8, 12) +
        "-4" +
        hash.slice(13, 16) +
        "-8" +
        hash.slice(17, 20) +
        "-" +
        hash.slice(20, 32);
      if (seen.has(id)) continue;
      // Include every choice: many community questions otherwise depend on unseen options.
      const choices = [answer, ...row.incorrect_answers.map(decode)].sort(
        (a, b) => a.localeCompare(b),
      );
      existing.push({
        id,
        text: text + " Choices: " + choices.join(" · "),
        answer,
        alternatives: [],
        explanation:
          "Open Trivia DB's community answer is " +
          answer +
          ". Source: Open Trivia DB contributors (CC BY-SA 4.0).",
        subject: map[cat] || "General Knowledge",
        subcategory: cat,
        difficulty:
          row.difficulty === "easy"
            ? "Easy"
            : row.difficulty === "hard"
              ? "Hard"
              : "Medium",
        source: "https://opentdb.com/",
        tags: ["community", "CC-BY-SA-4.0"],
        format: "short_answer",
        review_status: "community",
      });
      seen.add(id);
    }
    writeFileSync(path, JSON.stringify(existing, null, 2) + "\n");
    console.log("Saved", existing.length, "unique community questions.");
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
