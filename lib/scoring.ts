export function normalize(value: string) {
  const numeric = value.trim();
  if (/^[+-]?\d+(\.\d+)?$/.test(numeric)) return numeric.replace(/^\+/, "");
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function isCorrect(answer: string, accepted: string[]) {
  return accepted.some((a) => normalize(a) === normalize(answer));
}
export function canManage(role: string) {
  return role === "admin";
}
export type Round = {
  status: "waiting" | "open" | "locked" | "resolved";
  winner: string | null;
  points: number;
};
export function transition(
  round: Round,
  event: "open" | "buzz" | "correct" | "incorrect",
  player: string | null = null,
): Round {
  if (
    event === "open" &&
    (round.status === "waiting" || round.status === "resolved")
  )
    return { ...round, status: "open", winner: null };
  if (event === "buzz" && round.status === "open" && player)
    return { ...round, status: "locked", winner: player };
  if (
    (event === "correct" || event === "incorrect") &&
    round.status === "locked"
  )
    return {
      ...round,
      status: "resolved",
      points: event === "correct" ? 10 : 0,
    };
  throw new Error("Invalid round transition");
}
