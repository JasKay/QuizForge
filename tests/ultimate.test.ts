import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createUltimateRun,
  advanceUltimate,
  ultimateScore,
} from "../lib/ultimate";
import { ultimatePacks } from "../lib/ultimate-packs";
import { choicesForQuestion } from "../lib/choices";
test("Ultimate Challenge packs contain ten questions on one named topic", () => {
  assert.equal(ultimatePacks.length, 4);
  const ids = new Set<string>();
  for (const pack of ultimatePacks) {
    assert.equal(pack.questions.length, 10);
    for (const q of pack.questions) {
      assert.equal(q.subcategory, pack.title);
      assert.equal(ids.has(q.id), false);
      ids.add(q.id);
      assert.equal(choicesForQuestion(q, pack.questions).length, 4);
    }
  }
});
test("Ultimate Challenge recycles misses in order and awards each question only once", () => {
  let run = createUltimateRun();
  run = advanceUltimate(run, 0, false);
  assert.deepEqual(run.queue, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  assert.equal(ultimateScore(run), 0);
  assert.equal(advanceUltimate(run, 0, true), run);
  for (let i = 1; i <= 9; i++) run = advanceUltimate(run, i, true);
  assert.equal(ultimateScore(run), 225);
  run = advanceUltimate(run, 0, true);
  assert.equal(ultimateScore(run), 250);
  assert.deepEqual(run.queue, []);
  assert.equal(advanceUltimate(run, 0, true), run);
  assert.throws(() => createUltimateRun(9));
});
