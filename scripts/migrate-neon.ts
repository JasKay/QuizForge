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
    for (const name of [
      "002_voice",
      "003_choices_numeric",
      "004_host_plays",
      "005_reading_phase",
      "006_teams",
      "007_second_chance",
      "008_hcasc_rooms",
    ]) {
      const applied = await db.query(
        "select name from public.quizforge_migrations where name=$1",
        [name],
      );
      if (!applied.rowCount) {
        await db.query(readFileSync("db/migrations/" + name + ".sql", "utf8"));
        await db.query(
          "insert into public.quizforge_migrations(name) values($1)",
          [name],
        );
      }
    }
    await db.query(
      "insert into arena.questions(id,text,answer,alternatives,explanation,subject,difficulty,source) select id,text,answer,alternatives,explanation,subject,difficulty,source from jsonb_to_recordset($1::jsonb) as q(id uuid,text text,answer text,alternatives text[],explanation text,subject text,difficulty text,source text) on conflict(id) do nothing",
      [JSON.stringify(questions)],
    );
    await db.query("commit");
    console.log(
      "Neon migrations applied; " +
        questions.length +
        " questions available for seeding.",
    );
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
