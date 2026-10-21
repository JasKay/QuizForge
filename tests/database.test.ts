import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("database enforces isolation, scoring, replay safety, transitions and imports", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;alter default privileges in schema public grant all on tables to anon,authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
    );
    await db.exec(
      readFileSync("supabase/migrations/001_foundation.sql", "utf8"),
    );
    await db.exec(readFileSync("supabase/seed.sql", "utf8"));
    const u1 = "10000000-0000-4000-8000-000000000001",
      u2 = "10000000-0000-4000-8000-000000000002",
      q1 = "00000000-0000-4000-8000-000000000003",
      q2 = "00000000-0000-4000-8000-000000000010";
    await db.exec(
      `insert into auth.users(id) values('${u1}'),('${u2}');set role authenticated;set request.jwt.claim.sub='${u1}';`,
    );
    assert.equal((await db.query("select * from profiles")).rows.length, 1);
    assert.equal(
      (await db.query("select * from question_bank")).rows.length,
      12,
    );
    await assert.rejects(db.query("select answer from questions"));
    await assert.rejects(
      db.query("update question_bank set text='Tampered question'"),
    );
    await assert.rejects(db.query("update profiles set role='admin'"));
    await assert.rejects(
      db.query("insert into attempts(correct) values(true)"),
    );
    await assert.rejects(
      db.query("select start_practice($1,false,'normal')", [[q1, q1]]),
    );
    await assert.rejects(db.query("select review_answer($1)", [q1]));
    const started = await db.query<{ id: string }>(
      "select start_practice($1,false,'normal') as id",
      [[q1, q2]],
    );
    const sid = started.rows[0].id;
    await assert.rejects(db.query("select advance_practice($1)", [sid]));
    await assert.rejects(
      db.query("select submit_answer($1,$2,$3)", [sid, q2, "Mitochondria"]),
    );
    const result = await db.query<{
      r: { result: { correct: boolean }; attempt: { id: string } };
    }>("select submit_answer($1,$2,$3) as r", [sid, q1, " IRON! "]);
    assert.equal(result.rows[0].r.result.correct, true);
    const retry = await db.query<{ r: { attempt: { id: string } } }>(
      "select submit_answer($1,$2,$3) as r",
      [sid, q1, "Wrong"],
    );
    assert.equal(retry.rows[0].r.attempt.id, result.rows[0].r.attempt.id);
    await db.query("select advance_practice($1)", [sid]);
    await db.query("select submit_answer($1,$2,$3)", [sid, q2, "Wrong"]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from practice_sessions",
        )
      ).rows[0].status,
      "completed",
    );
    await assert.rejects(db.query("select advance_practice($1)", [sid]));
    await db.exec(`set request.jwt.claim.sub='${u2}'`);
    assert.equal((await db.query("select * from attempts")).rows.length, 0);
    await assert.rejects(
      db.query("select submit_answer($1,$2,$3)", [sid, q1, "Iron"]),
    );
    await assert.rejects(db.query("select review_answer($1)", [q1]));
    await assert.rejects(
      db.query("select import_questions($1)", [JSON.stringify([])]),
    );
    await db.exec(
      `reset role;update profiles set role='admin' where id='${u2}';set role authenticated;`,
    );
    const item = {
      text: "Which planet is called the Red Planet?",
      answer: "Mars",
      subject: "Science",
      difficulty: "Easy",
      explanation: "Iron oxides give Mars its red appearance.",
      source: "https://science.nasa.gov/mars/",
    };
    await db.query("select import_questions($1)", [JSON.stringify([item])]);
    assert.equal(
      (await db.query("select * from question_bank")).rows.length,
      12,
    );
    await db.exec(`reset role;`);
    assert.equal(
      (await db.query("select * from questions where review_status='pending'"))
        .rows.length,
      1,
    );
    const timed = await db.query<{ id: string }>(
      "select start_practice($1,true,'normal') as id",
      [[q1]],
    );
    await db.query(
      "update practice_sessions set question_started_at=clock_timestamp()-interval '31 seconds' where id=$1",
      [timed.rows[0].id],
    );
    await db.exec("set role authenticated");
    const expired = await db.query<{ r: { result: { correct: boolean } } }>(
      "select submit_answer($1,$2,$3) as r",
      [timed.rows[0].id, q1, "Iron"],
    );
    assert.equal(expired.rows[0].r.result.correct, false);
  } finally {
    await db.close();
  }
});
