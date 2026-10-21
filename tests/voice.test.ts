import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { questions, subjects } from "../lib/questions";

test("expanded library preserves identifiers, category coverage, and community attribution", () => {
  assert.ok(questions.length >= 600);
  assert.ok(subjects.length >= 20);
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
  for (const subject of subjects)
    assert.ok(
      questions.some((q) => q.subject === subject),
      subject,
    );
  for (const q of questions) {
    assert.match(
      q.id,
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/,
    );
    assert.ok(q.text.trim() && q.answer.trim() && q.explanation.trim());
    assert.match(q.source, /^https:\/\//);
    if (q.tags.includes("community"))
      assert.match(q.explanation, /CC BY-SA 4.0/);
  }
});
test("voice answers enforce ownership, five-second timeouts, and idempotent moderator correction", async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync("db/migrations/001_arena.sql", "utf8"));
    await db.exec(readFileSync("db/migrations/002_voice.sql", "utf8"));
    const host = "91000000-0000-4000-8000-000000000001",
      player = "91000000-0000-4000-8000-000000000002",
      viewer = "91000000-0000-4000-8000-000000000003";
    for (const [i, id] of [host, player, viewer].entries())
      await db.query("insert into arena.guests(id,token_hash) values($1,$2)", [
        id,
        String(i).repeat(64),
      ]);
    for (const q of questions.slice(0, 3))
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
        "select arena.create_room($1,'Coach','Voice check',null,3,3,10,-5) code",
        [host],
      )
    ).rows[0].code;
    await db.query("select arena.join_room($1,$2,'Player',false)", [
      player,
      code,
    ]);
    await db.query("select arena.join_room($1,$2,'Viewer',true)", [
      viewer,
      code,
    ]);
    await db.query("select arena.start_room($1,$2)", [host, code]);
    const state = async (id = player) =>
      (
        await db.query<{ s: any }>("select arena.room_snapshot($1,$2) s", [
          id,
          code,
        ])
      ).rows[0].s;
    assert.equal((await state()).armed, false);
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [player, code]),
    );
    await db.query("select arena.arm_room($1,$2,1)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,1)", [player, code]);
    const voice = (
      id: string,
      index: number,
      text: string,
      audio = "YWJj",
      mime = "audio/webm",
    ) =>
      db.query("select arena.voice_room($1,$2,$3,$4,$5,$6)", [
        id,
        code,
        index,
        text,
        audio,
        mime,
      ]);
    await assert.rejects(voice(viewer, 1, "answer"));
    await assert.rejects(voice(player, 1, "answer", "YWJj", "text/html"));
    await voice(player, 1, "misheard name");
    assert.equal((await state(viewer)).voice.transcript, "misheard name");
    assert.equal((await state()).voice.needs_review, true);
    assert.equal(
      (await state()).members.find((m: any) => m.id === player).score,
      -5,
    );
    await assert.rejects(
      db.query("select arena.review_voice($1,$2,1,true)", [viewer, code]),
    );
    for (let i = 0; i < 2; i++)
      await db.query("select arena.review_voice($1,$2,1,true)", [host, code]);
    assert.equal(
      (await state()).members.find((m: any) => m.id === player).score,
      10,
    );
    assert.equal((await state()).voice.needs_review, false);
    await voice(player, 1, "retry");
    assert.equal(
      (await state()).members.find((m: any) => m.id === player).score,
      10,
    );
    await db.query("select arena.next_room($1,$2,1)", [host, code]);
    assert.equal((await state()).voice, null);
    await db.query("select arena.arm_room($1,$2,2)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,2)", [player, code]);
    await db.query(
      "update arena.rooms set locked_at=clock_timestamp()-interval '6 seconds' where code=$1",
      [code],
    );
    assert.equal((await state(viewer)).status, "resolved");
    assert.equal((await state()).result.correct, false);
    await assert.rejects(
      db.query("select arena.review_voice($1,$2,2,true)", [host, code]),
    );
    assert.equal(
      (await state()).members.find((m: any) => m.id === player).score,
      5,
    );
    await db.query("select arena.next_room($1,$2,2)", [host, code]);
    await db.query("select arena.arm_room($1,$2,3)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,3)", [player, code]);
    await voice(player, 3, "");
    assert.equal((await state()).voice.needs_review, true);
    assert.equal((await state()).voice.transcript, "");
  } finally {
    await db.close();
  }
});
