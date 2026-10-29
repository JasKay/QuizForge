import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { questions } from "../lib/questions";
import { ultimatePacks } from "../lib/ultimate-packs";
test("connected HCASC enforces representatives, immediate reading, complete pairs, bonuses and two final turns", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create table public.buzzer_user(id text primary key,name text);",
    );
    for (const name of readdirSync("db/migrations")
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(readFileSync(`db/migrations/${name}`, "utf8"));
    await db.query(
      "insert into arena.questions(id,text,answer,alternatives,explanation,subject,difficulty,source) select id,text,answer,alternatives,explanation,subject,difficulty,source from jsonb_to_recordset($1::jsonb) as q(id uuid,text text,answer text,alternatives text[],explanation text,subject text,difficulty text,source text)",
      [JSON.stringify(questions)],
    );
    for (const p of ultimatePacks)
      await db.query("insert into arena.ultimate_packs values($1,$2,$3,$4)", [
        p.id,
        p.title,
        p.description,
        p.questions.map((q) => q.id),
      ]);
    const players = Array.from(
        { length: 6 },
        (_, i) => `96000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      ),
      host = players[0];
    for (const [i, id] of players.entries()) {
      await db.query("insert into arena.guests(id,token_hash) values($1,$2)", [
        id,
        String(i + 1).repeat(64),
      ]);
      await db.query("insert into public.buzzer_user values($1,$1)", [id]);
    }
    const code = (
      await db.query<{ code: string }>(
        "select arena.create_hcasc_room($1,'Host') code",
        [host],
      )
    ).rows[0].code;
    for (const id of players.slice(1))
      await db.query("select arena.join_room($1,$2,'Player',false)", [
        id,
        code,
      ]);
    await db.query("update arena.members set account_user_id=guest_id::text");
    await db.query("select arena.start_hcasc_room($1,$2)", [host, code]);
    const meta = async () =>
      (
        await db.query<{ s: any }>("select arena.hcasc_metadata($1,$2) s", [
          host,
          code,
        ])
      ).rows[0].s;
    const room = async () =>
      (
        await db.query<{ s: any }>("select arena.room_snapshot($1,$2) s", [
          host,
          code,
        ])
      ).rows[0].s;
    const sides = (
      await db.query<{ guest_id: string; team: string }>(
        "select guest_id,team from arena.members",
      )
    ).rows;
    let m = await meta();
    const chooser = sides.find((p) => p.team === m.pick_team)!.guest_id;
    const before = Date.now();
    await db.query("select arena.pick_hcasc_question($1,$2,$3,1)", [
      chooser,
      code,
      m.board[0].category,
    ]);
    let r = await room();
    assert.ok(
      Math.abs(Date.parse(r.reading_started_at) - before) < 1000,
      "reading starts immediately",
    );
    await assert.rejects(
      db.query("select arena.arm_room($1,$2,$3)", [host, code, r.index]),
      /still being read/,
    );
    await db.query(
      "update arena.rooms set read_until=now()-interval '1 second',round_ends_at=now()-interval '1 second' where code=$1",
      [code],
    );
    await db.query("select arena.sync_hcasc_round($1,$2)", [host, code]);
    assert.equal((await meta()).round, 1, "selected pair survives round end");
    await db.query("select arena.arm_room($1,$2,$3)", [host, code, r.index]);
    const representative = m.representatives.A,
      other = sides.find(
        (p) => p.team === "A" && p.guest_id !== representative,
      )!.guest_id;
    await assert.rejects(
      db.query("select arena.buzz_room($1,$2,$3)", [other, code, r.index]),
      /representative/,
    );
    await db.query("select arena.buzz_room($1,$2,$3)", [
      representative,
      code,
      r.index,
    ]);
    await db.query("select arena.answer_room($1,$2,$3,$4)", [
      representative,
      code,
      r.index,
      questions.find((q) => q.id === r.question.id)!.answer,
    ]);
    await db.query("select arena.next_hcasc_question($1,$2,$3)", [
      host,
      code,
      r.index,
    ]);
    r = await room();
    m = await meta();
    assert.equal(m.question_kind, "bonus");
    assert.equal(m.bonus_team, "A");
    assert.equal(r.correct_points, 20);
    assert.equal(r.steal_available, false);
    const opposing = sides.find((p) => p.team === "B")!.guest_id;
    await assert.rejects(
      db.query("select arena.answer_bonus($1,$2,$3,'wrong')", [
        opposing,
        code,
        r.index,
      ]),
      /bonus team/,
    );
    await db.query(
      "update arena.rooms set read_until=now()-interval '1 second' where code=$1",
      [code],
    );
    await db.query("select arena.arm_room($1,$2,$3)", [host, code, r.index]);
    await db.query("select arena.answer_bonus($1,$2,$3,$4)", [
      representative,
      code,
      r.index,
      questions.find((q) => q.id === r.question.id)!.answer,
    ]);
    await assert.rejects(
      db.query("select arena.answer_bonus($1,$2,$3,'replay')", [
        representative,
        code,
        r.index,
      ]),
    );
    await db.query("select arena.next_hcasc_question($1,$2,$3)", [
      host,
      code,
      r.index,
    ]);
    m = await meta();
    assert.equal(m.round, 2);
    assert.equal(m.pick_team, "B", "trailing team picks");
    assert.notEqual(m.representatives.A, representative);
    for (let i = 0; i < 2; i++) {
      await db.query(
        "update arena.rooms set round_ends_at=now()-interval '1 second' where code=$1",
        [code],
      );
      await db.query("select arena.sync_hcasc_round($1,$2)", [host, code]);
    }
    m = await meta();
    assert.equal(m.round, 4);
    assert.equal(m.hcasc_phase, "ultimate_pick");
    assert.equal(m.ultimate_team, "B");
    assert.equal(m.final_categories.length, 4);
    const firstTeam = m.ultimate_team,
      responder = sides.find((p) => p.team === firstTeam)!.guest_id;
    await db.query("select arena.pick_ultimate($1,$2,$3)", [
      responder,
      code,
      m.final_categories[0].id,
    ]);
    m = await meta();
    assert.equal(m.hcasc_phase, "ultimate");
    assert.equal(m.ultimate_question.answer, undefined);
    const first = m.ultimate_question.id;
    await db.query("select arena.answer_ultimate($1,$2,0,'',true)", [
      responder,
      code,
    ]);
    m = await meta();
    assert.notEqual(m.ultimate_question.id, first);
    assert.equal(m.ultimate_cleared, 0);
    await assert.rejects(
      db.query("select arena.answer_ultimate($1,$2,0,'wrong',false)", [
        responder,
        code,
      ]),
      /changed/,
    );
    for (let i = 0; i < 10; i++) {
      m = await meta();
      await db.query("select arena.answer_ultimate($1,$2,$3,$4,false)", [
        responder,
        code,
        m.ultimate_sequence,
        questions.find((q) => q.id === m.ultimate_question.id)!.answer,
      ]);
    }
    m = await meta();
    assert.equal(m.hcasc_phase, "ultimate_pick");
    assert.equal(m.ultimate_team, "A");
    const pack = m.final_categories.find((p: any) => !p.selected_by);
    await db.query("select arena.pick_ultimate($1,$2,$3)", [
      representative,
      code,
      pack.id,
    ]);
    await db.query(
      "update arena.rooms set round_ends_at=now()-interval '1 second' where code=$1",
      [code],
    );
    await db.query("select arena.sync_hcasc_round($1,$2)", [host, code]);
    r = await room();
    assert.equal(r.status, "finished");
    assert.equal(r.members.find((p: any) => p.id === representative).score, 30);
    assert.equal(r.members.find((p: any) => p.id === responder).score, 500);
    const events = await db.query("select * from buzzer.mastery_events");
    assert.equal(events.rows.length, 13);
    // Scoring corrections edit evidence rather than adding another award.
    await db.query(
      "update arena.room_attempts set correct=false where winner_id=$1",
      [representative],
    );
    const corrected = await db.query<{ n: number }>(
      "select count(*)::integer n from buzzer.mastery_events where user_id=$1 and correct",
      [representative],
    );
    assert.equal(corrected.rows[0].n, 0);
    // Ties continue into a read-locked, ten-point sudden-death Face-Off.
    await db.query("update arena.members set score=0");
    await db.query(
      "update arena.rooms set status='open',hcasc_phase='ultimate',ultimate_turn=2,round_ends_at=now()-interval '1 second' where code=$1",
      [code],
    );
    await db.query("select arena.sync_hcasc_round($1,$2)", [host, code]);
    m = await meta();
    r = await room();
    assert.equal(m.sudden_death, true);
    assert.equal(m.hcasc_phase, "question");
    assert.equal(r.armed, false);
    await db.query(
      "update arena.rooms set read_until=now()-interval '1 second' where code=$1",
      [code],
    );
    await db.query("select arena.arm_room($1,$2,$3)", [host, code, r.index]);
    const tiePlayer = m.representatives.A;
    await db.query("select arena.buzz_room($1,$2,$3)", [
      tiePlayer,
      code,
      r.index,
    ]);
    await db.query("select arena.answer_room($1,$2,$3,$4)", [
      tiePlayer,
      code,
      r.index,
      questions.find((q) => q.id === r.question.id)!.answer,
    ]);
    await db.query("select arena.next_hcasc_question($1,$2,$3)", [
      host,
      code,
      r.index,
    ]);
    assert.equal((await room()).status, "finished");
    const q = questions[0];
    for (let i = 0; i < 2; i++)
      await db.query(
        "select buzzer.record_attempt($1,'same-id',$2,true,'play')",
        [host, q.id],
      );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::integer n from buzzer.mastery_events where event_id='same-id'",
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});
