import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { questions } from "../lib/questions";
test("second chances hide the answer, exclude the missed team, preserve voice attempts, and grade only twice", async () => {
  const db = new PGlite();
  try {
    for (const m of [
      "001_arena",
      "002_voice",
      "003_choices_numeric",
      "004_host_plays",
      "005_reading_phase",
      "006_teams",
      "007_second_chance",
    ])
      await db.exec(readFileSync("db/migrations/" + m + ".sql", "utf8"));
    const [host, b, a, viewer] = [1, 2, 3, 4].map(
      (n) => "93000000-0000-4000-8000-" + String(n).padStart(12, "0"),
    );
    for (const [i, id] of [host, b, a, viewer].entries())
      await db.query("insert into arena.guests(id,token_hash) values($1,$2)", [
        id,
        String(i).repeat(64),
      ]);
    for (const q of questions.slice(0, 4))
      await db.query(
        "insert into arena.questions(id,text,answer,explanation,subject,difficulty,source) values($1,$2,$3,$4,$5,$6,$7)",
        [
          q.id,
          q.text,
          q.answer,
          q.explanation,
          q.subject,
          q.difficulty,
          q.source,
        ],
      );
    const code = (
      await db.query<{ code: string }>(
        "select arena.create_room($1,'Host','Second chance',null,4,30,10,0) code",
        [host],
      )
    ).rows[0].code;
    await db.query("select arena.join_room($1,$2,'B',false)", [b, code]);
    await db.query("select arena.join_room($1,$2,'A',false)", [a, code]);
    await db.query("select arena.join_room($1,$2,'Viewer',true)", [
      viewer,
      code,
    ]);
    await db.query("select arena.start_room($1,$2)", [host, code]);
    const snapshot = async () =>
      (
        await db.query<{ s: any }>("select arena.room_snapshot($1,$2) s", [
          host,
          code,
        ])
      ).rows[0].s;
    const open = async (i: number) => {
      await db.query(
        "update arena.rooms set read_until=now()-interval '1 second' where code=$1",
        [code],
      );
      await db.query("select arena.arm_room($1,$2,$3)", [host, code, i]);
    };
    const buzz = async (who: string, i: number) =>
      db.query("select arena.buzz_room($1,$2,$3)", [who, code, i]);
    const answer = async (who: string, i: number, text: string) =>
      db.query("select arena.answer_room($1,$2,$3,$4)", [who, code, i, text]);
    const voice = async (who: string, i: number) =>
      db.query(
        "select arena.voice_room($1,$2,$3,'misheard','AAAA','audio/webm')",
        [who, code, i],
      );
    await open(1);
    let s = await snapshot();
    const correct = questions.find((q) => q.id === s.question.id)!.answer;
    await buzz(host, 1);
    await answer(host, 1, "wrong");
    s = await snapshot();
    assert.equal(s.steal_available, true);
    assert.equal(s.steal_team, "B");
    assert.equal(s.result.answer, undefined);
    assert.equal(s.result.source, undefined);
    await assert.rejects(
      db.query("select arena.next_room($1,$2,1)", [host, code]),
      /still has a chance/,
    );
    await assert.rejects(
      db.query("select arena.steal_room($1,$2,1)", [b, code]),
    );
    await db.query("select arena.steal_room($1,$2,1)", [host, code]);
    s = await snapshot();
    assert.equal(s.attempt, 2);
    assert.equal(s.result, null);
    assert.equal(s.armed, true);
    for (const who of [host, a, viewer]) await assert.rejects(buzz(who, 1));
    await buzz(b, 1);
    await answer(b, 1, correct);
    await answer(b, 1, correct);
    s = await snapshot();
    assert.equal(s.result.correct, true);
    assert.equal(s.steal_available, false);
    assert.equal(s.members.find((m: any) => m.id === b).score, 10);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from arena.room_attempts where question_index=1",
        )
      ).rows[0].n,
      2,
    );
    await db.query("select arena.next_room($1,$2,1)", [host, code]);
    s = await snapshot();
    assert.equal(s.attempt, 1);
    assert.equal(s.steal_team, null);
    assert.equal(s.armed, false);
    await open(2);
    await buzz(b, 2);
    await voice(b, 2);
    await db.query("select arena.steal_room($1,$2,2)", [host, code]);
    await buzz(host, 2);
    await voice(host, 2);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from arena.voice_answers where question_index=2",
        )
      ).rows[0].n,
      2,
    );
    await db.query("select arena.review_voice($1,$2,2,true)", [host, code]);
    await db.query("select arena.review_voice($1,$2,2,true)", [host, code]);
    s = await snapshot();
    assert.equal(s.result.correct, true);
    assert.equal(s.members.find((m: any) => m.id === host).score, 10);
    assert.equal(s.steal_available, false);
    await db.query("select arena.next_room($1,$2,2)", [host, code]);
    await open(3);
    await buzz(host, 3);
    await answer(host, 3, "wrong");
    await db.query("select arena.steal_room($1,$2,3)", [host, code]);
    await buzz(b, 3);
    await answer(b, 3, "wrong");
    s = await snapshot();
    assert.equal(s.steal_available, false);
    assert.ok(s.result.answer);
    await assert.rejects(
      db.query("select arena.steal_room($1,$2,3)", [host, code]),
    );
    await db.query("select arena.next_room($1,$2,3)", [host, code]);
    await open(4);
    await buzz(host, 4);
    await db.query(
      "update arena.rooms set locked_at=now()-interval '6 seconds' where code=$1",
      [code],
    );
    s = await snapshot();
    assert.equal(s.steal_available, true);
    await db.query("select arena.steal_room($1,$2,4)", [host, code]);
    await buzz(b, 4);
    await db.query(
      "update arena.rooms set locked_at=now()-interval '6 seconds' where code=$1",
      [code],
    );
    s = await snapshot();
    assert.equal(s.steal_available, false);
    assert.equal(s.result.correct, false);
    await db.query("select arena.next_room($1,$2,4)", [host, code]);
    assert.equal((await snapshot()).status, "finished");
  } finally {
    await db.close();
  }
});
