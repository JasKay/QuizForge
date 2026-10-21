import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { questions } from "../lib/questions";
test("shared rooms isolate viewers, order buzzes, hide answers, grade once, and save team results", async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync("db/migrations/001_arena.sql", "utf8"));
    await db.exec(readFileSync("db/migrations/002_voice.sql", "utf8"));
    const ids = Array.from(
      { length: 5 },
      (_, i) => `90000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    for (let i = 0; i < ids.length; i++)
      await db.query("insert into arena.guests(id,token_hash) values($1,$2)", [
        ids[i],
        String(i + 1).padStart(64, "a"),
      ]);
    for (const q of questions.slice(0, 12))
      await db.query(
        "insert into arena.questions(id,text,answer,alternatives,explanation,subject,difficulty,source) values($1,$2,$3,$4,$5,$6,$7,$8)",
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
    const [host, a, b, viewer, outside] = ids;
    const created = await db.query<{ code: string }>(
      "select arena.create_room($1,$2,$3,$4,5,30,10,-5) as code",
      [host, "Coach", "Test squad", "Science"],
    );
    const code = created.rows[0].code;
    assert.match(code, /^[A-F0-9]{8}$/);
    await assert.rejects(
      db.query("select arena.room_state($1,$2)", [outside, code]),
    );
    await assert.rejects(
      db.query("select arena.start_room($1,$2)", [host, code]),
    );
    await db.query("select arena.join_room($1,$2,$3,false)", [a, code, "Ada"]);
    await db.query("select arena.join_room($1,$2,$3,false)", [
      b,
      code,
      "Grace",
    ]);
    await db.query("select arena.join_room($1,$2,$3,true)", [
      viewer,
      code,
      "Viewer",
    ]);
    await assert.rejects(db.query("select arena.start_room($1,$2)", [a, code]));
    await db.query("select arena.start_room($1,$2)", [host, code]);
    const snapshot = async (gid: string) =>
      (
        await db.query<{ state: any }>(
          "select arena.room_snapshot($1,$2) as state",
          [gid, code],
        )
      ).rows[0].state;
    let state = await snapshot(a);
    assert.equal(state.status, "open");
    assert.equal(state.question.answer, undefined);
    assert.equal(state.result, null);
    assert.equal((await snapshot(viewer)).question.text, state.question.text);
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [viewer, code]),
    );
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [host, code]),
    );
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [a, code]),
    );
    await assert.rejects(
      db.query("select arena.arm_room($1,$2,1)", [viewer, code]),
    );
    await db.query("select arena.arm_room($1,$2,1)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,1)", [a, code]);
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [b, code]),
    );
    assert.equal((await snapshot(b)).winner, a);
    await assert.rejects(
      db.query("select arena.answer_room($1,$2,1,$3)", [b, code, "Iron"]),
    );
    const answer = questions.find((q) => q.id === state.question.id)!.answer;
    await db.query("select arena.answer_room($1,$2,1,$3)", [a, code, answer]);
    await db.query("select arena.answer_room($1,$2,1,$3)", [a, code, "Retry"]);
    state = await snapshot(viewer);
    assert.equal(state.result.correct, true);
    assert.equal(state.result.answer, answer);
    assert.equal(state.members.find((m: any) => m.id === a).score, 10);
    await assert.rejects(
      db.query("select arena.next_room($1,$2,1)", [a, code]),
    );
    await db.query("select arena.next_room($1,$2,1)", [host, code]);
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [b, code]),
    );
    await db.query("select arena.arm_room($1,$2,2)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,2)", [b, code]);
    await assert.rejects(
      db.query("select arena.judge_room($1,$2,2,true)", [viewer, code]),
    );
    await db.query("select arena.judge_room($1,$2,2,false)", [host, code]);
    await assert.rejects(
      db.query("select arena.judge_room($1,$2,2,true)", [host, code]),
    );
    await db.query("select arena.next_room($1,$2,2)", [host, code]);
    state = await snapshot(a);
    assert.equal(state.status, "finished");
    assert.equal(state.review.length, 2);
    assert.equal(state.members.find((m: any) => m.id === b).score, -5);
    await db.query("select arena.start_room($1,$2)", [host, code]);
    state = await snapshot(a);
    assert.equal(state.members.find((m: any) => m.id === a).score, 0);
    await db.query("select arena.arm_room($1,$2,1)", [host, code]);
    await db.query(
      "update arena.rooms set opened_at=clock_timestamp()-interval '31 seconds' where code=$1",
      [code],
    );
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [a, code]),
    );
    await db.query("select arena.reveal_room($1,$2,1)", [host, code]);
    await db.query("select arena.next_room($1,$2,1)", [host, code]);
    await db.query("select arena.arm_room($1,$2,2)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,2)", [b, code]);
    state = await snapshot(b);
    await db.query(
      "update arena.rooms set locked_at=clock_timestamp()-interval '16 seconds' where code=$1",
      [code],
    );
    await db.query("select arena.answer_room($1,$2,2,$3)", [
      b,
      code,
      questions.find((q) => q.id === state.question.id)!.answer,
    ]);
    assert.equal((await snapshot(b)).result.correct, false);
    await db.query("select arena.leave_room($1,$2)", [host, code]);
    await assert.rejects(snapshot(a));
    await db.exec("create role untrusted_client;set role untrusted_client");
    await assert.rejects(db.query("select * from arena.rooms"));
    await assert.rejects(
      db.query("select arena.resolve_round(null,true,'tampered')"),
    );
  } finally {
    await db.close();
  }
});
