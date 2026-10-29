import { questions, subjects } from "./questions";
export type MasterySource =
  "learn" | "review" | "play" | "ultimate" | "room" | "legacy";
export type MasteryEvent = {
  id: string;
  questionId: string;
  correct: boolean;
  at: number;
  source: MasterySource;
};
export type DomainMastery = {
  subject: string;
  power: number;
  change: number;
  level: number;
  xp: number;
  attempts: number;
  accuracy: number;
  explored: number;
  total: number;
  due: number;
  history: number[];
  sources: string[];
};
export type MasteryProfile = {
  domains: DomainMastery[];
  xp: number;
  attempts: number;
  strongest: string | null;
  focus: string | null;
};
const bank = new Map(questions.map((q) => [q.id, q]));
const DAY = 86400000;
const weight = { Easy: 1, Medium: 2, Hard: 4 };
// Power measures current recall, not completion. Repeats cannot farm daily XP.
function domainAt(events: MasteryEvent[], now: number) {
  const evidence = new Map<
    string,
    {
      strength: number;
      at: number;
      xp: number;
      lastGain: number;
      correct: boolean;
    }
  >();
  let attempts = 0,
    correct = 0;
  for (const e of events) {
    if (e.at > now) continue;
    const q = bank.get(e.questionId);
    if (!q) continue;
    attempts++;
    if (e.correct) correct++;
    const old = evidence.get(q.id) || {
      strength: 0,
      at: e.at,
      xp: 0,
      lastGain: -Infinity,
      correct: false,
    };
    const strength =
      old.strength * Math.pow(0.5, Math.max(0, (e.at - old.at) / DAY - 7) / 30);
    const fresh = e.at - old.lastGain >= DAY;
    const recall =
      e.source === "learn" || e.source === "legacy"
        ? 0.65
        : e.source === "play" || e.source === "review"
          ? 0.8
          : 1;
    evidence.set(q.id, {
      strength: e.correct
        ? strength + (1 - strength) * (fresh ? 0.45 : 0.05) * recall
        : strength * 0.55,
      at: e.at,
      correct: e.correct,
      xp: old.xp + (e.correct && fresh ? weight[q.difficulty] * 10 : 0),
      lastGain: e.correct && fresh ? e.at : old.lastGain,
    });
  }
  let score = 0,
    xp = 0,
    due = 0;
  for (const [id, e] of evidence) {
    const age = (now - e.at) / DAY;
    score +=
      e.strength *
      weight[bank.get(id)!.difficulty] *
      Math.pow(0.5, Math.max(0, age - 7) / 30);
    xp += e.xp;
    if (!e.correct || age >= 7) due++;
  }
  return {
    power: Math.min(99, Math.round(99 * (1 - Math.exp(-score / 60)))),
    xp,
    attempts,
    accuracy: attempts ? Math.round((100 * correct) / attempts) : 0,
    explored: evidence.size,
    due,
  };
}
export function masteryProfile(
  input: MasteryEvent[],
  now = Date.now(),
): MasteryProfile {
  const seen = new Set<string>();
  const events = input
    .filter((e) => {
      if (seen.has(e.id) || !bank.has(e.questionId) || !Number.isFinite(e.at))
        return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const domains = subjects.map((subject) => {
    const rows = events.filter(
      (e) => bank.get(e.questionId)?.subject === subject,
    );
    const current = domainAt(rows, now);
    const history = Array.from(
      { length: 8 },
      (_, i) => domainAt(rows, now - (7 - i) * DAY).power,
    );
    return {
      subject,
      ...current,
      change: current.power - history[0],
      level: Math.floor(Math.sqrt(current.xp / 50)) + 1,
      total: questions.filter((q) => q.subject === subject).length,
      history,
      sources: [
        ...new Set(rows.filter((e) => e.at <= now).map((e) => e.source)),
      ],
    };
  });
  const active = domains
    .filter((d) => d.attempts > 0)
    .sort((a, b) => b.power - a.power || b.xp - a.xp);
  const focus = [...active].sort(
    (a, b) => (b.due > 0 ? 1 : 0) - (a.due > 0 ? 1 : 0) || a.power - b.power,
  )[0];
  return {
    domains,
    xp: domains.reduce((n, d) => n + d.xp, 0),
    attempts: domains.reduce((n, d) => n + d.attempts, 0),
    strongest: active[0]?.subject || null,
    focus: focus?.subject || null,
  };
}
