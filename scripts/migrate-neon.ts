import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { questions } from "../lib/questions";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required.");
const connectionUrl = new URL(
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
);
connectionUrl.searchParams.set("sslmode", "verify-full");
const db = new Client({ connectionString: connectionUrl.toString() });
async function main() {
  await db.connect();
  await db.query("begin");
  try {
    await db.query(
      "create table if not exists public.quizforge_migrations(name text primary key,applied_at timestamptz not null default now())",
    );
    const result = await db.query(
      "select name from public.quizforge_migrations where name=$1",
      ["001_arena"],
    );
    if (!result.rowCount) {
      await db.query(readFileSync("db/migrations/001_arena.sql", "utf8"));
      await db.query(
        "insert into public.quizforge_migrations(name) values($1)",
        ["001_arena"],
      );
    }
    for (const q of questions)
      await db.query(
        "insert into arena.questions(id,text,answer,alternatives,explanation,subject,difficulty,source) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do nothing",
        [
          q.id,
          q.text,
          q.answer,
          q.alternatives,
          q.explanation,
          q.subject,
          q.difficulty,
          q.source,
        ],
      );
    await db.query("commit");
    console.log("Neon migration and original question seed applied.");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    await db.end();
  }
}
main().catch((error) => {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});
