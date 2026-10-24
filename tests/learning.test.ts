import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conceptQuestions,
  conceptTransfers,
  conceptChoices,
  conceptTeaching,
} from "../lib/concept-course";
test("each taught concept has a distinct application question with a valid answer and worked example", () => {
  assert.equal(conceptTransfers.size, 3);
  for (const [id, application] of conceptTransfers) {
    const q = conceptQuestions.find((q) => q.id === id)!;
    const next = conceptQuestions.find((q) => q.id === application)!;
    assert.notEqual(q.text, next.text);
    assert.equal(
      conceptChoices.get(id)!.filter((c) => c === q.answer).length,
      1,
    );
    assert.equal(
      conceptChoices.get(application)!.filter((c) => c === next.answer).length,
      1,
    );
    assert.ok(conceptTeaching.get(id)?.example);
    const diagram = conceptTeaching.get(id)!.diagram!;
    assert.ok(diagram.filled > 0 && diagram.filled <= diagram.parts);
  }
});
import { isSpokenCorrect } from "../lib/spoken-answer";
test("fraction answers preserve the divider and accept mathematically equivalent shares", () => {
  assert.equal(isSpokenCorrect("26", ["2/6"]), false);
  assert.equal(isSpokenCorrect("2 / 6", ["2/6"]), true);
  assert.equal(isSpokenCorrect("1/3", ["2/6"]), true);
  assert.equal(isSpokenCorrect("2 over 6", ["2/6"]), true);
  assert.equal(isSpokenCorrect("2/0", ["2/6"]), false);
});
