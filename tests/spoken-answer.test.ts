import { test } from "node:test";
import assert from "node:assert/strict";
import { isSpokenCorrect } from "../lib/spoken-answer";
test("spoken answers accept number words and articles without accepting unrelated answers", () => {
  for (const [spoken, expected] of [
    ["ninety degrees", "90"],
    ["one hundred and eighty", "180"],
    ["three hundred sixty", "360"],
    ["sixteen", "16"],
    ["5.", "5"],
    ["Moon", "The Moon"],
    ["the sun", "The Sun"],
  ])
    assert.equal(isSpokenCorrect(spoken, [expected]), true, spoken);
  for (const v of [
    "nineteen",
    "negative ninety",
    "-90",
    "ninety five",
    "ninety or eighty",
    "forty fifty",
  ])
    assert.equal(isSpokenCorrect(v, ["90"]), false, v);
  assert.equal(isSpokenCorrect("Venus", ["Mercury"]), false);
});
