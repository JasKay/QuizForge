"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import type { Question } from "@/lib/questions";
import type { Result } from "@/lib/types";
import type { RefObject } from "react";
import { AnswerChoices } from "./answer-choices";
import { choicesForQuestion, questionStem } from "@/lib/choices";
import { questions } from "@/lib/questions";
type Props = {
  question: Question;
  index: number;
  length: number;
  timed: boolean;
  seconds: number;
  answer: string;
  setAnswer: (v: string) => void;
  result: Result | null;
  busy: boolean;
  submit: (v?: string) => void;
  next: () => void;
  summary: boolean;
  correct: number;
  points: number;
  lastPoints: number;
  combo: number;
  bestCombo: number;
  input: RefObject<HTMLInputElement | null>;
  party: boolean;
  players: string[];
  playerScores: number[];
  onReplay: () => void;
};
export function GameRound(p: Props) {
  if (p.summary)
    return (
      <section className="solo-results" data-focus="true">
        <p className="overline">ROUND COMPLETE</p>
        <h1>
          {p.correct}
          <span> / {p.length}</span>
        </h1>
        <p>correct answers</p>
        <div className="solo-result-metrics">
          <div>
            <strong>{p.points}</strong>
            <span>Points</span>
          </div>
          <div>
            <strong>{Math.round((p.correct / p.length) * 100)}%</strong>
            <span>Accuracy</span>
          </div>
        </div>
        <button className="trivia-primary" onClick={p.onReplay}>
          <RotateCcw size={18} />
          Play again
        </button>
        <Link href="/play" className="trivia-secondary">
          Home
        </Link>
      </section>
    );
  return (
    <section className="solo-game" data-focus="true">
      <header className="play-top">
        <Link href="/play" aria-label="Exit game">
          <ArrowLeft size={20} />
        </Link>
        <span>
          {p.index + 1} / {p.length}
        </span>
        {p.timed ? (
          <span role="timer">{p.seconds}s</span>
        ) : (
          <span className="play-top-spacer" />
        )}
      </header>
      <div className="slim-progress" aria-hidden="true">
        <span style={{ width: ((p.index + 1) / p.length) * 100 + "%" }} />
      </div>
      <div className="solo-question">
        <div className="solo-question-content">
          <span className="question-category">{p.question.subject}</span>
          <h1>{questionStem(p.question.text)}</h1>
        </div>
      </div>
      <AnswerChoices
        options={choicesForQuestion(p.question, questions)}
        disabled={!!p.result || p.busy}
        selected={p.answer}
        onChoose={p.submit}
      />
      {p.result && (
        <div
          className={
            "solo-feedback " + (p.result.correct ? "correct" : "incorrect")
          }
          role="status"
        >
          <div>
            <strong>
              {p.result.correct ? (
                <>
                  <Check size={18} />
                  Correct
                </>
              ) : (
                "Incorrect"
              )}
            </strong>
            {!p.result.correct && <p>{p.result.answer}</p>}
          </div>
          <button className="trivia-primary" onClick={p.next} disabled={p.busy}>
            {p.index + 1 === p.length ? "Results" : "Next"}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
