import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { questions } from "../lib/questions";
test("host can compete, reading blocks early arm and buzz, and next question locks again", async () => {
  const db = new PGlite();
  try {
    for (const name of [
      "001_arena",
      "002_voice",
      "003_choices_numeric",
      "004_host_plays",
      "005_reading_phase",
      "006_teams",
    ])
      await db.exec(readFileSync("db/migrations/" + name + ".sql", "utf8"));
    const [host, player, viewer] = [
      "92000000-0000-4000-8000-000000000001",
      "92000000-0000-4000-8000-000000000002",
      "92000000-0000-4000-8000-000000000003",
    ];
    for (const [i, id] of [host, player, viewer].entries())
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
    const { rows } = await db.query<{ code: string }>(
      "select arena.create_room($1,'Host','Practice',null,3,30,10,0) code",
      [host],
    );
    const code = rows[0].code;
    await db.query("select arena.join_room($1,$2,'Remote',false)", [
      player,
      code,
    ]);
    await db.query("select arena.join_room($1,$2,'Viewer',true)", [
      viewer,
      code,
    ]);
    let split = (
      await db.query<{ s: any }>("select arena.room_snapshot($1,$2) s", [
        host,
        code,
      ])
    ).rows[0].s;
    assert.equal(split.members.find((m: any) => m.id === host).team, "A");
    assert.equal(split.members.find((m: any) => m.id === player).team, "B");
    assert.equal(split.members.find((m: any) => m.id === viewer).team, null);
    await assert.rejects(
      db.query("select arena.assign_team($1,$2,$3,\x27A\x27)", [
        player,
        code,
        player,
      ]),
    );
    await db.query("select arena.assign_team($1,$2,$3,\x27A\x27)", [
      host,
      code,
      player,
    ]);
    await assert.rejects(
      db.query("select arena.start_room($1,$2)", [host, code]),
      /balanced/,
    );
    await db.query("select arena.assign_team($1,$2,$3,\x27B\x27)", [
      host,
      code,
      player,
    ]);
    await db.query("select arena.start_room($1,$2)", [host, code]);
    await assert.rejects(
      db.query("select arena.assign_team($1,$2,$3,\x27A\x27)", [
        host,
        code,
        player,
      ]),
    );
    const state = async () =>
      (
        await db.query<{ s: any }>("select arena.room_snapshot($1,$2) s", [
          host,
          code,
        ])
      ).rows[0].s;
    let room = await state();
    assert.equal(room.armed, false);
    assert.ok(
      Date.parse(room.read_until) > Date.parse(room.reading_started_at),
    );
    assert.equal(room.result, null);
    assert.equal(room.question.answer, undefined);
    await assert.rejects(
      db.query("select arena.arm_room($1,$2,1)", [host, code]),
      /still being read/,
    );
    for (const who of [host, player, viewer])
      await assert.rejects(
        db.query("select arena.buzz_room($1,$2,1)", [who, code]),
      );
    await db.query(
      "update arena.rooms set read_until=now()-interval '1 second' where code=$1",
      [code],
    );
    await assert.rejects(
      db.query("select arena.arm_room($1,$2,1)", [player, code]),
    );
    await db.query("select arena.arm_room($1,$2,1)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,1)", [host, code]);
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,1)", [player, code]),
    );
    await assert.rejects(
      db.query("select arena.answer_room($1,$2,1,'wrong')", [player, code]),
    );
    const answer = questions.find((q) => q.id === room.question.id)!.answer;
    await db.query("select arena.answer_room($1,$2,1,$3)", [
      host,
      code,
      answer,
    ]);
    await db.query("select arena.answer_room($1,$2,1,$3)", [
      host,
      code,
      answer,
    ]);
    room = await state();
    assert.equal(room.members.find((m: any) => m.id === host).score, 10);
    await db.query("select arena.next_room($1,$2,1)", [host, code]);
    room = await state();
    assert.equal(room.armed, false);
    await assert.rejects(
      db.query("select arena.arm_room($1,$2,2)", [host, code]),
      /still being read/,
    );
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,2)", [host, code]),
    );
  } finally {
    await db.close();
  }
});
