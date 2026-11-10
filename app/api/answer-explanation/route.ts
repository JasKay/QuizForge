import { questions } from "@/lib/questions";
import { choicesForQuestion } from "@/lib/choices";
import { normalize } from "@/lib/scoring";
import { explainMissedAnswer } from "@/lib/server/answer-explanations";
import { apiError, privateHeaders, readAction, text } from "@/lib/server/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(request: Request) {
  try {
    const body = await readAction(request);
    const questionId = text(body.questionId, 1, 100);
    const selectedAnswer = text(body.selectedAnswer, 1, 200);
    const question = questions.find((item) => item.id === questionId);
    if (!question)
      return Response.json({ error: "Question not found." }, { status: 404, headers: privateHeaders });
    const choices = choicesForQuestion(question, questions);
    if (!choices.some((choice) => normalize(choice) === normalize(selectedAnswer)))
      return Response.json({ error: "That answer is not one of the choices." }, { status: 400, headers: privateHeaders });
    const explanation = await explainMissedAnswer(request, question, selectedAnswer);
    return Response.json({ explanation }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
