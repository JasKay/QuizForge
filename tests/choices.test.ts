import { test } from "node:test";
import assert from "node:assert/strict";
import { choicesForQuestion, questionStem } from "../lib/choices";
import { normalize } from "../lib/scoring";
import { questions } from "../lib/questions";
test("every question has four stable distinct choices with exactly one accepted answer", () => {
  for (const q of questions) {
    const choices = choicesForQuestion(q, questions);
    assert.equal(choices.length, 4, q.id);
    assert.equal(new Set(choices.map(normalize)).size, 4, q.id);
    assert.equal(
      choices.filter((v) =>
        [q.answer, ...q.alternatives].some(
          (a) => normalize(a) === normalize(v),
        ),
      ).length,
      1,
      q.id,
    );
    assert.deepEqual(choices, choicesForQuestion(q, questions));
    assert.ok(!questionStem(q.text).includes(" Choices: "));
  }
});
test("private question choices exclude accepted alternative spellings as distractors", () => {
  const q = {
    id: "custom-id",
    text: "Which planet?",
    answer: "Mars",
    alternatives: ["The red planet"],
    subject: "Science",
  };
  const pool = ["Mars", "The red planet", "Venus", "Jupiter", "Saturn"].map(
    (answer) => ({ answer, subject: "Science" }),
  );
  assert.deepEqual(
    new Set(choicesForQuestion(q, pool)),
    new Set(["Mars", "Venus", "Jupiter", "Saturn"]),
  );
});
