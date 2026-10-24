export type GuestRecall = {
  questionId: string;
  answer: string;
  correct: boolean;
  at: number;
  earnedAnswer?: string;
};
const KEY = "buzzer-guest-recall-v1";
export function guestRecalls(): GuestRecall[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (r) =>
              r &&
              typeof r.questionId === "string" &&
              typeof r.answer === "string" &&
              typeof r.correct === "boolean" &&
              typeof r.at === "number",
          )
          .slice(-1000)
      : [];
  } catch {
    return [];
  }
}
export function saveGuestRecall(record: GuestRecall) {
  try {
    const previous = guestRecalls().find(
      (r) => r.questionId === record.questionId,
    );
    record = {
      ...record,
      earnedAnswer: record.correct ? record.answer : previous?.earnedAnswer,
    };
    const rows = guestRecalls().filter(
      (r) => r.questionId !== record.questionId,
    );
    localStorage.setItem(KEY, JSON.stringify([...rows, record].slice(-1000)));
  } catch {}
}
export function clearGuestRecalls() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
