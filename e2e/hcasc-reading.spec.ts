import { test, expect } from "./preview";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { questions } from "../lib/questions";
import { ultimatePacks } from "../lib/ultimate-packs";
import { questionStem } from "../lib/choices";
// Browser narration is deterministic; room state/scoring use the actual migrations.
test("category selection immediately narrates and keeps the buzzer locked until reading ends", async ({
  page,
}) => {
  test.setTimeout(60000);
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
    const host = "97000000-0000-4000-8000-000000000001",
      other = "97000000-0000-4000-8000-000000000002";
    for (const [i, id] of [host, other].entries())
      await db.query("insert into arena.guests(id,token_hash) values($1,$2)", [
        id,
        String(i + 1).repeat(64),
      ]);
    const code = (
      await db.query<{ code: string }>(
        "select arena.create_hcasc_room($1,'Jordan') code",
        [host],
      )
    ).rows[0].code;
    await db.query("select arena.join_room($1,$2,'Sam',false)", [other, code]);
    await db.query("select arena.start_hcasc_room($1,$2)", [host, code]);
    await db.query("update arena.rooms set pick_team='A' where code=$1", [
      code,
    ]);
    async function state() {
      await db.query("select arena.sync_hcasc_round($1,$2)", [host, code]);
      const r = (
        await db.query<{ s: any }>("select arena.room_snapshot($1,$2) s", [
          host,
          code,
        ])
      ).rows[0].s;
      Object.assign(
        r,
        (
          await db.query<{ s: any }>("select arena.hcasc_metadata($1,$2) s", [
            host,
            code,
          ])
        ).rows[0].s,
      );
      if (r.hcasc_phase === "pick") {
        r.question = null;
        r.result = null;
      }
      if (r.question) {
        r.question.text = questionStem(r.question.text);
        r.question.choices = [];
      }
      r.seconds = r.question_kind === "bonus" ? 5 : 3;
      return r;
    }
    await page.route("**/api/rooms**", async (route) => {
      if (route.request().url().includes("config=1")) {
        await route.fulfill({ json: { available: true } });
        return;
      }
      try {
        if (route.request().method() === "POST") {
          const b = route.request().postDataJSON();
          if (b.action === "pick")
            await db.query("select arena.pick_hcasc_question($1,$2,$3,$4)", [
              host,
              code,
              b.category,
              b.slot,
            ]);
          else if (b.action === "arm")
            await db.query("select arena.arm_room($1,$2,$3)", [
              host,
              code,
              b.index,
            ]);
          else if (b.action === "buzz")
            await db.query("select arena.buzz_room($1,$2,$3)", [
              host,
              code,
              b.index,
            ]);
          else if (b.action === "answer")
            await db.query("select arena.answer_room($1,$2,$3,$4)", [
              host,
              code,
              b.index,
              b.answer,
            ]);
          else if (b.action === "next_hcasc")
            await db.query("select arena.next_hcasc_question($1,$2,$3)", [
              host,
              code,
              b.index,
            ]);
        }
        await route.fulfill({ json: { room: await state() } });
      } catch (e) {
        await route.fulfill({ status: 400, json: { error: String(e) } });
      }
    });
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          cancel() {},
          speak(u: SpeechSynthesisUtterance) {
            (window as Window & { __narrated?: number }).__narrated =
              Date.now();
            setTimeout(() => u.onstart?.({} as SpeechSynthesisEvent), 1);
            setTimeout(() => u.onend?.({} as SpeechSynthesisEvent), 1600);
          },
        },
      });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/rooms?code=${code}`);
    await expect(page.locator(".hcasc-board")).toBeVisible();
    const chosenAt = Date.now();
    await page
      .getByRole("button", { name: "Question 1", exact: true })
      .first()
      .click();
    await expect(page.getByLabel("Question being read")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __narrated?: number }).__narrated || 0,
        ),
      )
      .toBeGreaterThan(chosenAt);
    const delay = await page.evaluate(
      () => (window as Window & { __narrated?: number }).__narrated || 0,
    );
    expect(delay - chosenAt).toBeLessThan(1500);
    const buzz = page.getByRole("button", { name: "Buzz in", exact: true });
    await expect(buzz).toBeDisabled();
    await expect(buzz).toBeEnabled({ timeout: 35000 });
    await buzz.click();
    await expect(page.getByLabel("Your answer", { exact: true })).toBeVisible();
    const r = await state(),
      q = questions.find((q) => q.id === r.question.id)!;
    await page.getByLabel("Your answer", { exact: true }).fill(q.answer);
    await page.getByRole("button", { name: "Submit answer" }).click();
    await expect(
      page.getByRole("button", { name: "Play the team bonus" }),
    ).toBeVisible();
    const previous = await page.evaluate(
      () => (window as Window & { __narrated?: number }).__narrated || 0,
    );
    await page.getByRole("button", { name: "Play the team bonus" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __narrated?: number }).__narrated || 0,
        ),
      )
      .toBeGreaterThan(previous);
    await expect(
      page.getByLabel("Confer with your team, then answer"),
    ).toBeDisabled();
    await page.screenshot({ path: "artifacts/hcasc-immediate-reading.png" });
  } finally {
    await db.close();
  }
});
