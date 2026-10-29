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
import { randomUUID } from "node:crypto";
import { databaseReady } from "@/lib/server/db";
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
    const user = databaseReady()
      ? (await getAuth().api.getSession({ headers: request.headers }))?.user
      : undefined;
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
    const user = databaseReady()
      ? (await getAuth().api.getSession({ headers: request.headers }))?.user
      : undefined;
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
        "insert into buzzer.progress(user_id,question_id,attempts,correct,last_correct,due_at) select $1,r.id,1,case when r.earned then 1 else 0 end,r.correct,now()+case when r.correct then interval '1 day' else interval '0 minutes' end from jsonb_to_recordset($2::jsonb) as r(id text,correct boolean,earned boolean) on conflict(user_id,question_id) do nothing",
        [user.id, JSON.stringify(rows)],
      );
      await database().query(
        "insert into buzzer.mastery_events(user_id,event_id,question_id,correct,source,happened_at) select p.user_id,'legacy:'||p.question_id,p.question_id,p.last_correct,'legacy',p.updated_at from buzzer.progress p where p.user_id=$1 and not exists(select 1 from buzzer.mastery_events e where e.user_id=p.user_id and e.question_id=p.question_id) on conflict do nothing",
        [user.id],
      );
      return Response.json({ ok: true }, { headers: privateHeaders });
    }
    const q = learningBank.find((q) => q.id === text(body.questionId));
    if (!q) throw new AppError("That question could not be found.", 404);
    const answer =
      typeof body.answer === "string" ? body.answer.slice(0, 500) : "";
    const correct = isSpokenCorrect(answer, [q.answer, ...q.alternatives]);
    let awarded = correct
      ? { Easy: 10, Medium: 20, Hard: 40 }[q.difficulty]
      : 0;
    if (user) {
      const source = ["learn", "review", "play", "ultimate"].includes(
        String(body.source),
      )
        ? String(body.source)
        : "learn";
      const attemptId =
        typeof body.attemptId === "string" &&
        /^[a-f0-9-]{36}$/i.test(body.attemptId)
          ? body.attemptId
          : randomUUID();
      const previous = await database().query(
        "select 1 from buzzer.mastery_events where user_id=$1 and question_id=$2 and correct and happened_at>now()-interval '1 day' limit 1",
        [user.id, q.id],
      );
      const result = await database().query(
        "select buzzer.record_attempt($1,$2,$3,$4,$5) as saved",
        [user.id, attemptId, q.id, correct, source],
      );
      awarded =
        correct && result[0]?.saved && !previous.length
          ? { Easy: 10, Medium: 20, Hard: 40 }[q.difficulty]
          : 0;
    }
    return Response.json(
      {
        correct,
        savedFor: user?.id || null,
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
