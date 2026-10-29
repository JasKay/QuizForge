import "server-only";
import { database } from "./db";
import {
  masteryProfile,
  type MasteryEvent,
  type MasterySource,
} from "../mastery";
export async function userMastery(userId: string) {
  const rows = await database().query(
    "select event_id,question_id,correct,source,happened_at from buzzer.mastery_events where user_id=$1 order by happened_at,event_id",
    [userId],
  );
  return masteryProfile(
    rows.map(
      (r) =>
        ({
          id: String(r.event_id),
          questionId: String(r.question_id),
          correct: !!r.correct,
          source: r.source as MasterySource,
          at: new Date(String(r.happened_at)).getTime(),
        }) satisfies MasteryEvent,
    ),
  );
}
