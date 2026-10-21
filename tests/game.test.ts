import { test } from "node:test";
import assert from "node:assert/strict";
import { arcadePoints, shuffled } from "../lib/game";
test("arcade scores reward combos with a capped multiplier and bounded speed bonus", () => {
  assert.equal(arcadePoints(false, 0, true, 9), 0);
  assert.equal(arcadePoints(true, 0, false, 1), 100);
  assert.equal(arcadePoints(true, 0, false, 2), 125);
  assert.equal(arcadePoints(true, 0, false, 10), 200);
  assert.equal(arcadePoints(true, 0, true, 1), 150);
  assert.equal(arcadePoints(true, 60000, true, 1), 100);
  assert.equal(arcadePoints(true, -1000, true, 1), 150);
  assert.equal(
    [1, 2, 3, 4, 5].reduce((n, c) => n + arcadePoints(true, 0, false, c), 0),
    750,
  );
});
test("shuffling preserves the question pool without mutating it", () => {
  const source = [1, 2, 3, 4, 5];
  const result = shuffled(source);
  assert.deepEqual([...result].sort(), source);
  assert.notEqual(result, source);
  assert.deepEqual(source, [1, 2, 3, 4, 5]);
});
