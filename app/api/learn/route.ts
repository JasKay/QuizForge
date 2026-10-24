import { database } from "@/lib/server/db";
import {
  requireUser,
  readAction,
  apiError,
  AppError,
  privateHeaders,
  text,
} from "@/lib/server/account";
import { lessons, learningQuestions, explanationFor } from "@/lib/learning";
import { isSpokenCorrect } from "@/lib/spoken-answer";
import { questions } from "@/lib/questions";
import { choicesForQuestion, questionStem } from "@/lib/choices";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const progress = await database().query(
      "select question_id, attempts, correct, last_correct, due_at from buzzer.progress where user_id=$1",
      [user.id],
    );
    const byId = new Map(progress.map((p) => [String(p.question_id), p]));
    const catalog = lessons.map((l) => ({
      id: l.id,
      title: l.title,
      intro: l.intro,
      icon: l.icon,
      subject: l.subject,
      learned: l.questions.filter((q) => byId.get(q.id)?.last_correct).length,
      total: l.questions.length,
    }));
    const url = new URL(request.url);
    let selected = [] as typeof questions;
    if (url.searchParams.get("review") === "1") {
      const due = progress
        .filter((p) => new Date(String(p.due_at)).getTime() <= Date.now())
        .sort(
          (a, b) =>
            new Date(String(a.due_at)).getTime() -
            new Date(String(b.due_at)).getTime(),
        );
      selected = due
        .map((p) => questions.find((q) => q.id === p.question_id))
        .filter((q): q is (typeof questions)[number] => !!q)
        .slice(0, 5);
    } else if (url.searchParams.has("lesson")) {
      const l = lessons.find(
        (item) => item.id === url.searchParams.get("lesson"),
      );
      if (!l) throw new AppError("That lesson could not be found.", 404);
      selected = [...l.questions]
        .sort((a, b) => {
          const pa = byId.get(a.id),
            pb = byId.get(b.id);
          return (
            Number(!!pa?.last_correct) - Number(!!pb?.last_correct) ||
            (pa ? new Date(String(pa.due_at)).getTime() : 0) -
              (pb ? new Date(String(pb.due_at)).getTime() : 0)
          );
        })
        .slice(0, 5);
    }
    return Response.json(
      {
        catalog,
        due: progress.filter(
          (p) => new Date(String(p.due_at)).getTime() <= Date.now(),
        ).length,
        total: progress.length,
        correct: progress.reduce((n, p) => n + Number(p.correct), 0),
        attempts: progress.reduce((n, p) => n + Number(p.attempts), 0),
        questions: selected.map((q) => ({
          id: q.id,
          text: questionStem(q.text),
          choices: choicesForQuestion(q, questions),
          source: q.source,
          study: learningQuestions.has(q.id)
            ? { answer: q.answer, explanation: explanationFor(q.id) }
            : null,
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
    const user = await requireUser(request),
      body = await readAction(request);
    const q = questions.find((q) => q.id === text(body.questionId));
    if (!q) throw new AppError("That question could not be found.", 404);
    const answer =
      typeof body.answer === "string" ? body.answer.slice(0, 500) : "";
    const correct = isSpokenCorrect(answer, [q.answer, ...q.alternatives]);
    await database().query(
      `insert into buzzer.progress(user_id,question_id,attempts,correct,last_correct,due_at) values($1,$2,1,$3,$4,now()+case when $4 then interval '1 day' else interval '10 minutes' end)
      on conflict(user_id,question_id) do update set attempts=buzzer.progress.attempts+1,correct=buzzer.progress.correct+excluded.correct,last_correct=$4,updated_at=now(),due_at=now()+case when $4 then interval '1 day'*least(30,power(2,least(5,buzzer.progress.correct))::integer) else interval '10 minutes' end
      where buzzer.progress.updated_at < now()-interval '2 seconds'`,
      [user.id, q.id, correct ? 1 : 0, correct],
    );
    return Response.json(
      {
        correct,
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
