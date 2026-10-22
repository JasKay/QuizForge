import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createUltimateRun,
  advanceUltimate,
  ultimateScore,
  questionsForUltimatePack,
} from "../lib/ultimate";
import { ultimatePacks } from "../lib/ultimate-packs";
import { choicesForQuestion } from "../lib/choices";
import { questions } from "../lib/questions";
test("Ultimate Challenge offers ten topics with fifty distinct questions each", () => {
  assert.equal(ultimatePacks.length, 10);
  for (const pack of ultimatePacks) {
    const selected = questionsForUltimatePack(pack, questions);
    assert.equal(selected.length, 50);
    assert.equal(new Set(selected.map((q) => q.id)).size, 50);
    for (const q of selected) {
      assert.equal(choicesForQuestion(q, pack.questions).length, 4);
    }
  }
});
test("Ultimate Challenge recycles misses in order and awards each question only once", () => {
  let run = createUltimateRun();
  run = advanceUltimate(run, 0, false);
  assert.deepEqual(run.queue, [...Array.from({ length: 49 }, (_, i) => i + 1), 0]);
  assert.equal(ultimateScore(run), 0);
  assert.equal(advanceUltimate(run, 0, true), run);
  for (let i = 1; i < 50; i++) run = advanceUltimate(run, i, true);
  assert.equal(ultimateScore(run), 1225);
  run = advanceUltimate(run, 0, true);
  assert.equal(ultimateScore(run), 1250);
  assert.deepEqual(run.queue, []);
  assert.equal(advanceUltimate(run, 0, true), run);
  assert.throws(() => createUltimateRun(10));
});
