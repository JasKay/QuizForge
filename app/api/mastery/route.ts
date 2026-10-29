import {
  requireUser,
  readAction,
  apiError,
  privateHeaders,
  AppError,
} from "@/lib/server/account";
import { userMastery } from "@/lib/server/mastery";
import { database } from "@/lib/server/db";
import { questions } from "@/lib/questions";
import { isSpokenCorrect } from "@/lib/spoken-answer";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return Response.json(await userMastery(user.id), {
      headers: privateHeaders,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request),
      body = await readAction(request);
    if (!Array.isArray(body.records) || body.records.length > 10)
      throw new AppError("Save up to ten answers at a time.");
    for (const r of body.records) {
      if (
        !r ||
        typeof r.id !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(r.id) ||
        typeof r.answer !== "string" ||
        r.answer.length > 500 ||
        !["learn", "review", "play", "ultimate"].includes(r.source) ||
        !Number.isFinite(r.at) ||
        r.at < 0
      )
        throw new AppError("Invalid saved answer.");
      const q = questions.find((q) => q.id === r.questionId);
      if (!q) continue;
      await database().query(
        "select buzzer.record_attempt($1,$2,$3,$4,$5,$6)",
        [
          user.id,
          r.id,
          q.id,
          isSpokenCorrect(r.answer, [q.answer, ...q.alternatives]),
          r.source,
          new Date(Math.min(Date.now(), r.at)).toISOString(),
        ],
      );
    }
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
