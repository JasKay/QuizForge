import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createUltimateRun,
  advanceUltimate,
  ultimateScore,
  questionsForUltimatePack,
} from "../lib/ultimate";
import { ultimatePacks } from "../lib/ultimate-packs";
test("Ultimate Challenge keeps ten distinct questions within each specific theme", () => {
  assert.equal(ultimatePacks.length, 4);
  for (const pack of ultimatePacks) {
    const selected = questionsForUltimatePack(pack);
    assert.equal(selected.length, 10);
    assert.equal(new Set(selected.map((q) => q.id)).size, 10);
    for (const q of selected) {
      assert.equal(q.subcategory, pack.title);
      assert.ok(pack.questions.some((item) => item.id === q.id));
    }
  }
});
test("Ultimate Challenge rejects an incomplete theme instead of filling from unrelated topics", () => {
  assert.throws(
    () =>
      questionsForUltimatePack({
        questions: ultimatePacks[0].questions.slice(0, 9),
      }),
    /only 9/,
  );
});
test("Ultimate Challenge recycles misses in order and awards each question only once", () => {
  let run = createUltimateRun();
  run = advanceUltimate(run, 0, false);
  assert.deepEqual(run.queue, [
    ...Array.from({ length: 9 }, (_, i) => i + 1),
    0,
  ]);
  assert.equal(ultimateScore(run), 0);
  assert.equal(advanceUltimate(run, 0, true), run);
  for (let i = 1; i < 10; i++) run = advanceUltimate(run, i, true);
  assert.equal(ultimateScore(run), 450);
  run = advanceUltimate(run, 0, true);
  assert.equal(ultimateScore(run), 500);
  assert.deepEqual(run.queue, []);
  assert.equal(advanceUltimate(run, 0, true), run);
  assert.throws(() => createUltimateRun(50));
});
