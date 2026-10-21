import { test } from "node:test";
import assert from "node:assert/strict";
import { isCorrect, transition, canManage, type Round } from "../lib/scoring";
import { parseCSV } from "../lib/csv";
test("answer normalization accepts alternatives but rejects partial matches", () => {
  assert.equal(isCorrect("  JANE Austen! ", ["Jane Austen"]), true);
  assert.equal(isCorrect("Austen", ["Jane Austen", "Austen"]), true);
  assert.equal(isCorrect("Jane", ["Jane Austen"]), false);
  assert.equal(isCorrect("", ["Iron"]), false);
  assert.equal(isCorrect("+40", ["-40"]), false);
  assert.equal(isCorrect("15", ["1.5"]), false);
  assert.equal(isCorrect("+40", ["40"]), true);
  assert.equal(isCorrect("Jémison", ["Jemison"]), true);
});
test("only administrator role manages questions", () => {
  for (const r of ["student", "coach", "moderator", ""])
    assert.equal(canManage(r), false);
  assert.equal(canManage("admin"), true);
});
test("future round reducer locks out subsequent buzzes and enforces transitions", () => {
  let s: Round = { status: "waiting", winner: null, points: 0 };
  assert.throws(() => transition(s, "buzz", "p1"));
  s = transition(s, "open");
  s = transition(s, "buzz", "p1");
  assert.equal(s.winner, "p1");
  assert.throws(() => transition(s, "buzz", "p2"));
  s = transition(s, "correct");
  assert.equal(s.points, 10);
  assert.throws(() => transition(s, "correct"));
  s = transition(s, "open");
  assert.equal(s.winner, null);
});
test("CSV supports quoted commas, escaped quotes and multiline text", () => {
  const rows = parseCSV(
    'text,answer,subject,difficulty,explanation,source\r\n"A question, with ""quotes""\nand a new line",Iron,Science,Easy,An explanation,https://example.org',
  );
  assert.equal(rows.length, 1);
  assert.match(rows[0].text, /"quotes"/);
  assert.match(rows[0].text, /\n/);
  assert.equal(rows[0].review_status, "pending");
  assert.throws(() => parseCSV("text,answer\na,b"));
  assert.throws(() =>
    parseCSV(
      "text,answer,subject,difficulty,explanation,source\nQ,A,Bad,Easy,Explanation,https://example.org",
    ),
  );
});
