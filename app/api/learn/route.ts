import { chooseTrailQuestions } from "@/lib/trivia-trails";
import { database } from "@/lib/server/db";
import {
  readAction,
  apiError,
  AppError,
  privateHeaders,
  text,
} from "@/lib/server/account";
import { lessons, learningQuestions, explanationFor } from "@/lib/learning";
import { getAuth } from "@/lib/auth";
import { isSpokenCorrect } from "@/lib/spoken-answer";
import { questions } from "@/lib/questions";
import { choicesForQuestion, questionStem } from "@/lib/choices";
const learningBank = questions;
const legacyAnswers = new Map([
  ["learn-fractions-equal-parts", "2/6"],
  ["learn-fractions-equal-parts-apply", "3/8"],
  ["learn-fractions-equivalent", "2/6"],
  ["learn-fractions-equivalent-apply", "6/15"],
  ["learn-fractions-compare", "5/7"],
  ["learn-fractions-compare-apply", "7/9"],
]);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = (await getAuth().api.getSession({ headers: request.headers }))
      ?.user;
    const progress = user
      ? await database().query(
          "select question_id, attempts, correct, last_correct, due_at, updated_at from buzzer.progress where user_id=$1",
          [user.id],
        )
      : [];
    const validDue = progress.filter(
      (p) =>
        learningQuestions.has(String(p.question_id)) &&
        new Date(String(p.due_at)).getTime() <= Date.now(),
    );
    const byId = new Map(progress.map((p) => [String(p.question_id), p]));
    const catalog = lessons.map((l) => ({
      id: l.id,
      title: l.title,
      intro: l.intro,
      icon: l.icon,
      subject: l.subject,
      related: l.related,
      seen: l.questions.filter((q) => byId.has(q.id)).length,
      learned: l.questions.filter((q) => byId.get(q.id)?.last_correct).length,
      total: l.questions.length,
      questionIds: l.questions.map((q) => q.id),
    }));
    const url = new URL(request.url);
    let selected = [] as typeof questions;
    if (url.searchParams.get("review") === "1") {
      const due = validDue.sort(
        (a, b) =>
          new Date(String(a.due_at)).getTime() -
          new Date(String(b.due_at)).getTime(),
      );
      selected = due
        .map((p) => learningBank.find((q) => q.id === p.question_id))
        .filter((q): q is (typeof questions)[number] => !!q)
        .slice(0, 5);
      if (!user)
        selected = (url.searchParams.get("ids") || "")
          .split(",")
          .slice(0, 5)
          .map((id) => learningBank.find((q) => q.id === id))
          .filter((q): q is (typeof questions)[number] => !!q);
    } else if (
      url.searchParams.has("lesson") ||
      url.searchParams.has("trail")
    ) {
      const l = lessons.find(
        (item) =>
          item.id ===
          (url.searchParams.get("trail") || url.searchParams.get("lesson")),
      );
      if (!l) throw new AppError("That trail could not be found.", 404);
      const state = new Map(
        progress.map((p) => [
          String(p.question_id),
          {
            correct: !!p.last_correct,
            at: new Date(String(p.updated_at)).getTime(),
          },
        ]),
      );
      if (!user) {
        const seen = (url.searchParams.get("exclude") || "").split(",");
        const missed = new Set(
          (url.searchParams.get("missed") || "").split(","),
        );
        seen.forEach((id, index) =>
          state.set(id, { correct: !missed.has(id), at: seen.length - index }),
        );
      }
      selected = chooseTrailQuestions(l, state);
    }
    return Response.json(
      {
        xp: progress.filter((p) => Number(p.correct) > 0).length * 10,
        catalog,
        due: validDue.length,
        total: progress.length,
        correct: progress.reduce((n, p) => n + Number(p.correct), 0),
        attempts: progress.reduce((n, p) => n + Number(p.attempts), 0),
        questions: selected.map((q) => ({
          id: q.id,
          text: questionStem(q.text),
          choices: choicesForQuestion(q, questions),
          subject: q.subject,
          category: q.subcategory.replace(/^Entertainment: |^Science: /, ""),
          source: q.source,
          study: {
            answer: q.answer,
            explanation: q.explanation,
          },
        })),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readAction(request);
    const user = (await getAuth().api.getSession({ headers: request.headers }))
      ?.user;
    if (body.action === "import") {
      if (!user) throw new AppError("Sign in to save this progress.", 401);
      if (!Array.isArray(body.records) || body.records.length > 200)
        throw new AppError("Please try saving a smaller session.");
      const seen = new Set<string>();
      const rows = body.records.flatMap((record) => {
        if (!record || typeof record !== "object") return [];
        const r = record as {
          questionId?: unknown;
          answer?: unknown;
          earnedAnswer?: unknown;
        };
        const id = typeof r.questionId === "string" ? r.questionId : "";
        const legacy = legacyAnswers.get(id);
        const q =
          learningBank.find((q) => q.id === id) ||
          (legacy ? { id, answer: legacy, alternatives: [] } : undefined);
        if (
          !q ||
          typeof r.answer !== "string" ||
          r.answer.length > 500 ||
          seen.has(q.id)
        )
          return [];
        seen.add(q.id);
        const correct = isSpokenCorrect(r.answer, [
          q.answer,
          ...q.alternatives,
        ]);
        const earned =
          correct ||
          (typeof r.earnedAnswer === "string" &&
            r.earnedAnswer.length <= 500 &&
            isSpokenCorrect(r.earnedAnswer, [q.answer, ...q.alternatives]));
        return [{ id: q.id, correct, earned }];
      });
      await database().query(
        "insert into buzzer.progress(user_id,question_id,attempts,correct,last_correct,due_at) select $1,r.id,1,case when r.earned then 1 else 0 end,r.correct,now()+case when r.correct then interval '1 day' else interval '10 minutes' end from jsonb_to_recordset($2::jsonb) as r(id text,correct boolean,earned boolean) on conflict(user_id,question_id) do nothing",
        [user.id, JSON.stringify(rows)],
      );
      return Response.json({ ok: true }, { headers: privateHeaders });
    }
    const q = learningBank.find((q) => q.id === text(body.questionId));
    if (!q) throw new AppError("That question could not be found.", 404);
    const answer =
      typeof body.answer === "string" ? body.answer.slice(0, 500) : "";
    const correct = isSpokenCorrect(answer, [q.answer, ...q.alternatives]);
    let awarded = correct ? 10 : 0;
    if (user) {
      const result = await database().query(
        `insert into buzzer.progress(user_id,question_id,attempts,correct,last_correct,due_at) values($1,$2,1,$3,$4,now()+case when $4 then interval '1 day' else interval '10 minutes' end)
      on conflict(user_id,question_id) do update set attempts=buzzer.progress.attempts+1,correct=buzzer.progress.correct+excluded.correct,last_correct=$4,updated_at=now(),due_at=now()+case when $4 then interval '1 day'*least(30,power(2,least(5,buzzer.progress.correct))::integer) else interval '10 minutes' end
      returning correct`,
        [user.id, q.id, correct ? 1 : 0, correct],
      );
      awarded = correct && Number(result[0]?.correct) === 1 ? 10 : 0;
    }
    return Response.json(
      {
        correct,
        xp: awarded,
        answer: q.answer,
        explanation: explanationFor(q.id) || q.explanation,
        source: q.source,
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
