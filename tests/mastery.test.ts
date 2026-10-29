import { test } from "node:test";
import assert from "node:assert/strict";
import { masteryProfile, type MasteryEvent } from "../lib/mastery";
import { questions } from "../lib/questions";
const now = Date.UTC(2026, 9, 29),
  day = 86400000;
const event = (
  q: (typeof questions)[number],
  correct = true,
  at = now,
  id = "one",
): MasteryEvent => ({ id, questionId: q.id, correct, at, source: "play" });
const domain = (rows: MasteryEvent[], subject: string, at = now) =>
  masteryProfile(rows, at).domains.find((d) => d.subject === subject)!;
test("difficulty weights XP and power; levels keep XP when recall weakens", () => {
  const hard = questions.find((q) => q.difficulty === "Hard")!,
    easy = questions.find((q) => q.difficulty === "Easy")!;
  const h = domain([event(hard)], hard.subject),
    e = domain([event(easy)], easy.subject);
  assert.equal(h.xp, 40);
  assert.equal(e.xp, 10);
  assert.ok(h.power > e.power);
  const miss = domain(
    [event(hard), event(hard, false, now + 1000, "two")],
    hard.subject,
    now + 1000,
  );
  assert.ok(miss.power < h.power);
  assert.equal(miss.xp, h.xp);
  assert.equal(miss.level, h.level);
  assert.equal(miss.due, 1);
});
test("review restores faded power; repeat IDs and same-day repeats do not farm XP", () => {
  const q = questions.find((q) => q.difficulty === "Hard")!,
    initial = event(q, true, now - 90 * day);
  const faded = domain([initial], q.subject);
  const reviewed = {
    ...event(q, true, now, "review"),
    source: "review" as const,
  };
  const restored = domain([initial, reviewed, reviewed], q.subject);
  assert.ok(restored.power > faded.power);
  assert.equal(restored.attempts, 2);
  assert.equal(restored.xp, 80);
  const repeated = domain(
    [initial, reviewed, event(q, true, now + 1000, "repeat")],
    q.subject,
    now + 1000,
  );
  assert.equal(repeated.xp, 80);
  assert.ok(restored.history[0] <= restored.history[7]);
});
test("power never reaches completion and repeated easy questions cannot replace breadth", () => {
  const q = questions.find((q) => q.difficulty === "Easy")!;
  const rows = Array.from({ length: 500 }, (_, i) =>
    event(q, true, now - i * day, String(i)),
  );
  assert.ok(domain(rows, q.subject).power < 5);
  assert.ok(
    masteryProfile(
      questions.map((q, i) => event(q, true, now, String(i))),
    ).domains.every((d) => d.power < 100),
  );
});
