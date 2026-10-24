import { test } from "node:test";
import assert from "node:assert/strict";
import { questions } from "../lib/questions";
import { triviaTrails, chooseTrailQuestions } from "../lib/trivia-trails";
test("trivia trails cover the existing bank and link to valid related topics", () => {
  const bank = new Set(
    triviaTrails.flatMap((t) => t.questions.map((q) => q.id)),
  );
  assert.equal(bank.size, new Set(questions.map((q) => q.id)).size);
  assert.ok(triviaTrails.length >= 20);
  for (const trail of triviaTrails) {
    assert.ok(trail.questions.length > 0);
    assert.equal(
      new Set(trail.questions.map((q) => q.id)).size,
      trail.questions.length,
    );
    assert.ok(trail.related.length >= 2);
    for (const id of trail.related) {
      assert.notEqual(id, trail.id);
      assert.ok(triviaTrails.some((t) => t.id === id));
    }
  }
});
test("new questions come first, then missed connections, then oldest known questions without mutating the bank", () => {
  const trail = triviaTrails.find((t) => t.id === "trail-geography")!;
  const before = trail.questions.map((q) => q.id);
  const state = new Map<string, { correct: boolean; at: number }>();
  for (const q of chooseTrailQuestions(trail, state))
    state.set(q.id, { correct: true, at: 10 });
  const second = chooseTrailQuestions(trail, state);
  assert.ok(second.every((q) => !state.has(q.id)));
  for (const q of trail.questions) state.set(q.id, { correct: true, at: 20 });
  state.set(trail.questions[3].id, { correct: false, at: 30 });
  state.set(trail.questions[4].id, { correct: true, at: 1 });
  const revisit = chooseTrailQuestions(trail, state);
  assert.equal(revisit[0].id, trail.questions[3].id);
  assert.equal(revisit[1].id, trail.questions[4].id);
  assert.deepEqual(
    trail.questions.map((q) => q.id),
    before,
  );
});
