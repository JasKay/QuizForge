import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("HCASC rooms rotate category picks, keep second chances, and advance on four-minute round clocks", async () => {
  const db = new PGlite();
  try {
    for (const migration of [
      "001_arena",
      "002_voice",
      "003_choices_numeric",
      "004_host_plays",
      "005_reading_phase",
      "006_teams",
      "007_second_chance",
      "008_hcasc_rooms",
    ])
      await db.exec(
        readFileSync(`db/migrations/${migration}.sql`, "utf8"),
      );

    const [host, teamB] = [1, 2].map(
      (n) => `94000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    );
    for (const [index, id] of [host, teamB].entries())
      await db.query("insert into arena.guests(id,token_hash) values($1,$2)", [
        id,
        String(index + 1).repeat(64),
      ]);
    const categories = Array.from({ length: 12 }, (_, i) => `Category ${i + 1}`);
    for (let i = 0; i < 36; i++) {
      const id = `95000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
      await db.query(
        "insert into arena.questions(id,text,answer,explanation,subject,difficulty,source) values($1,$2,$3,$4,$5,'Easy','test')",
        [
          id,
          `Test prompt ${i + 1}? Choices: Wrong one · Wrong two · Wrong three · Correct answer`,
          "Correct answer",
          "Test explanation",
          categories[Math.floor(i / 3)],
        ],
      );
    }

    const code = (
      await db.query<{ code: string }>(
        "select arena.create_hcasc_room($1,'Host') code",
        [host],
      )
    ).rows[0].code;
    await db.query("select arena.join_room($1,$2,'Player B',false)", [
      teamB,
      code,
    ]);
    await db.query("select arena.start_hcasc_room($1,$2)", [host, code]);

    const metadata = async (gid = host) =>
      (
        await db.query<{ data: any }>(
          "select arena.hcasc_metadata($1,$2) data",
          [gid, code],
        )
      ).rows[0].data;
    let board = await metadata();
    assert.equal(board.mode, "hcasc");
    assert.equal(board.round, 1);
    assert.equal(board.pick_team, "A");
    assert.equal(board.board.length, 4);
    assert.ok(board.board.every((category: any) => category.slots.length === 3));

    const chosenCategory = board.board[0].category;
    await assert.rejects(
      db.query("select arena.pick_hcasc_question($1,$2,$3,1)", [
        teamB,
        code,
        chosenCategory,
      ]),
    );
    await db.query("select arena.pick_hcasc_question($1,$2,$3,1)", [
      host,
      code,
      chosenCategory,
    ]);
    let state = (
      await db.query<{ state: any }>(
        "select arena.room_snapshot($1,$2) state",
        [host, code],
      )
    ).rows[0].state;
    assert.equal(state.index, 1);
    assert.ok(state.question);
    assert.equal((await metadata()).board.find(
      (category: any) => category.category === chosenCategory,
    ).slots[0].available, false);

    await db.query(
      "update arena.rooms set read_until=now()-interval '1 second' where code=$1",
      [code],
    );
    await db.query("select arena.arm_room($1,$2,1)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,1)", [host, code]);
    await db.query("select arena.answer_room($1,$2,1,'wrong answer')", [
      host,
      code,
    ]);
    state = (
      await db.query<{ state: any }>(
        "select arena.room_snapshot($1,$2) state",
        [teamB, code],
      )
    ).rows[0].state;
    assert.equal(state.steal_available, true);
    await db.query("select arena.steal_room($1,$2,1)", [host, code]);
    await db.query("select arena.buzz_room($1,$2,1)", [teamB, code]);
    await db.query(
      "select arena.answer_room($1,$2,1,'Correct answer')",
      [teamB, code],
    );
    await db.query("select arena.next_hcasc_question($1,$2,1)", [host, code]);
    board = await metadata();
    assert.equal(board.pick_team, "B");

    await db.query("update arena.rooms set round_ends_at=now()-interval '1 second' where code=$1", [code]);
    await db.query("select arena.sync_hcasc_round($1,$2)", [teamB, code]);
    board = await metadata(teamB);
    assert.equal(board.round, 2);
    assert.equal(board.pick_team, "B");
    assert.equal(board.board.length, 4);
  } finally {
    await db.close();
  }
});
