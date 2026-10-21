import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseCSV } from "../lib/csv";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
async function main() {
  const file = process.argv[2];
  if (!file)
    throw Error("Usage: npm run bank:import -- questions.csv [--approve]");
  const rows = parseCSV(readFileSync(file, "utf8"));
  if (!rows.length) throw Error("No questions found.");
  if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required.");
  const url = new URL(
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  );
  url.searchParams.set("sslmode", "verify-full");
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  try {
    await db.query("begin");
    for (const q of rows) {
      const h = createHash("sha256")
        .update(q.text.toLowerCase().trim())
        .digest("hex");
      const id =
        h.slice(0, 8) +
        "-" +
        h.slice(8, 12) +
        "-4" +
        h.slice(13, 16) +
        "-8" +
        h.slice(17, 20) +
        "-" +
        h.slice(20, 32);
      await db.query(
        "insert into arena.questions(id,text,answer,alternatives,explanation,subject,difficulty,source,review_status) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(id) do nothing",
        [
          id,
          q.text,
          q.answer,
          q.alternatives,
          q.explanation,
          q.subject,
          q.difficulty,
          q.source,
          process.argv.includes("--approve") ? "approved" : "pending",
        ],
      );
    }
    await db.query("commit");
    console.log(
      rows.length +
        " rows processed (" +
        (process.argv.includes("--approve")
          ? "approved for rooms"
          : "pending; excluded from play") +
        ").",
    );
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
