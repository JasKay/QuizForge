import { guestRecalls } from "./guest-learning";
import type { MasteryEvent, MasterySource } from "./mastery";
const KEY = "buzzer-mastery-v1";
type SavedEvent = MasteryEvent & { answer: string; synced?: string };
function stored(): SavedEvent[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(rows)
      ? rows.filter(
          (r) =>
            typeof r.id === "string" &&
            typeof r.answer === "string" &&
            typeof r.at === "number",
        )
      : [];
  } catch {
    return [];
  }
}
function write(rows: SavedEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}
export function localMasteryEvents(): MasteryEvent[] {
  const all = stored(),
    rows = all.filter((r) => !r.synced),
    known = new Set(all.map((r) => r.questionId));
  const legacy: MasteryEvent[] = guestRecalls()
    .filter((r) => !known.has(r.questionId))
    .map((r) => ({
      id: `recall:${r.questionId}`,
      questionId: r.questionId,
      correct: r.correct,
      at: r.at,
      source: "legacy",
    }));
  try {
    const attempts = JSON.parse(localStorage.getItem("qf-attempts") || "[]");
    if (Array.isArray(attempts))
      for (const a of attempts)
        if (
          !known.has(a.question_id) &&
          typeof a.id === "string" &&
          Number.isFinite(Date.parse(a.created_at))
        )
          legacy.push({
            id: a.id,
            questionId: a.question_id,
            correct: !!a.correct,
            at: Date.parse(a.created_at),
            source: "play",
          });
  } catch {}
  return [...legacy, ...rows];
}
export async function recordMastery(
  questionId: string,
  answer: string,
  correct: boolean,
  source: MasterySource,
  id = crypto.randomUUID(),
) {
  rememberMastery(questionId, answer, correct, source, id);
  try {
    const response = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, answer, source, attemptId: id }),
    });
    const data = await response.json();
    if (response.ok && data.savedFor) {
      try {
        write(
          stored().map((r) =>
            r.id === id
              ? { ...r, correct: data.correct, synced: data.savedFor }
              : r,
          ),
        );
      } catch {}
    }
  } catch {}
}
export async function syncMastery(userId: string) {
  const pending = stored().filter((r) => !r.synced);
  for (let i = 0; i < pending.length; i += 10) {
    const records = pending.slice(i, i + 10);
    const response = await fetch("/api/mastery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    if (!response.ok)
      throw Error(
        "Recent games are saved on this device. Sync will retry when you return.",
      );
    const ids = new Set(records.map((r) => r.id));
    write(stored().map((r) => (ids.has(r.id) ? { ...r, synced: userId } : r)));
  }
}

export function rememberMastery(
  questionId: string,
  answer: string,
  correct: boolean,
  source: MasterySource,
  id: string,
  savedFor?: string,
) {
  const event: SavedEvent = {
    id,
    questionId,
    answer,
    correct,
    source,
    at: Date.now(),
    synced: savedFor,
  };
  try {
    write([...stored().filter((r) => r.id !== id), event]);
  } catch {}
  window.dispatchEvent(new Event("buzzer-mastery"));
}

export function legacyGuestRecalls() {
  const known = new Set(stored().map((r) => r.questionId));
  return guestRecalls().filter((r) => !known.has(r.questionId));
}
export function guestProgress() {
  const latest = new Map(guestRecalls().map((r) => [r.questionId, r]));
  for (const e of stored()
    .filter((r) => !r.synced)
    .sort((a, b) => a.at - b.at)) {
    const old = latest.get(e.questionId);
    if (!old || old.at <= e.at)
      latest.set(e.questionId, {
        questionId: e.questionId,
        answer: e.answer,
        correct: e.correct,
        at: e.at,
        earnedAnswer: e.correct ? e.answer : old?.earnedAnswer,
      });
  }
  return [...latest.values()];
}
