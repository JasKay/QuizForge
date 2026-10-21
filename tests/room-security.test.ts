import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sameOrigin,
  sameRequestOrigin,
  roomCode,
  validCode,
} from "../lib/room-security";
test("room API rejects cross-origin mutations and malformed room codes", () => {
  assert.equal(
    sameOrigin(
      "https://quizforge.vercel.app/api/rooms",
      "https://quizforge.vercel.app",
    ),
    true,
  );
  assert.equal(
    sameOrigin(
      "https://quizforge.vercel.app/api/rooms",
      "https://evil.example",
    ),
    false,
  );
  assert.equal(
    sameOrigin("https://quizforge.vercel.app/api/rooms", null),
    false,
  );
  assert.equal(
    sameOrigin("http://localhost:3000/api/rooms", "http://localhost:3001"),
    false,
  );
  assert.equal(validCode("A1B2C3D4"), true);
  assert.equal(roomCode(" a1b2c3d4 "), "A1B2C3D4");
  assert.throws(() => roomCode("';DROP TABLE arena.rooms;--"));
  assert.throws(() => roomCode("AAAAAAA"));
  assert.throws(() => roomCode("ZZZZZZZZ"));
});

test("browser-visible host stays same-origin when Next normalizes its internal URL", () => {
  assert.equal(
    sameRequestOrigin(
      "http://localhost:3087/api/rooms",
      "127.0.0.1:3087",
      "http://127.0.0.1:3087",
    ),
    true,
  );
  assert.equal(
    sameRequestOrigin(
      "http://localhost:3087/api/rooms",
      "127.0.0.1:3087",
      "https://evil.example",
    ),
    false,
  );
  assert.equal(
    sameRequestOrigin(
      "https://quizforge.vercel.app/api/rooms",
      "quizforge.vercel.app",
      "http://quizforge.vercel.app",
    ),
    false,
  );
});
