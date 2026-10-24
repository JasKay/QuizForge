"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Sparkles,
  X,
} from "lucide-react";
import { playSound, unlockSound } from "@/lib/game";
export type TriviaQuestion = {
  id: string;
  text: string;
  choices: string[];
  source: string;
  subject?: string;
  category?: string;
  study: { answer: string; explanation: string } | null;
};
export type TriviaFeedback = {
  correct: boolean;
  answer: string;
  explanation: string;
  source: string;
  xp?: number;
};
export function TriviaSession({
  title,
  questions,
  review,
  user,
  onAnswer,
  onComplete,
  onClose,
  onContinue,
  related,
  loading = false,
  continuationError = "",
  screenOverlay,
}: {
  title: string;
  questions: TriviaQuestion[];
  review: boolean;
  user: boolean;
  onAnswer: (q: TriviaQuestion, answer: string) => Promise<TriviaFeedback>;
  onComplete: () => void;
  onClose: () => void;
  onContinue: (id?: string) => void;
  related: { id: string; title: string }[];
  loading?: boolean;
  continuationError?: string;
  screenOverlay?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [index, setIndex] = useState(0),
    [feedback, setFeedback] = useState<TriviaFeedback | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [xp, setXp] = useState(0),
    [known, setKnown] = useState(0),
    [done, setDone] = useState(false);
  const q = questions[index];
  useLayoutEffect(() => {
    const node = body.current;
    if (!node) return;
    setCompact(false);
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (node.scrollHeight > node.clientHeight + 1) setCompact(true);
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    [...node.children].forEach((child) => observer.observe(child));
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [index, feedback, done]);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  async function answer(value: string) {
    if (busy || feedback) return;
    setBusy(true);
    setError("");
    unlockSound();
    try {
      const result = await onAnswer(q, value);
      setFeedback(result);
      setXp((n) => n + (result.xp || 0));
      if (result.correct) setKnown((n) => n + 1);
      playSound(result.correct ? "correct" : "miss");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not check that answer. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setFeedback(null);
    } else {
      setDone(true);
      onComplete();
    }
  }
  const explanation =
    feedback?.explanation && !feedback.explanation.startsWith("Open Trivia DB")
      ? feedback.explanation
      : "";
  return (
    <dialog
      ref={dialog}
      className="bz-trivia-session"
      aria-labelledby="trivia-session-title"
      onCancel={onClose}
    >
      <header className="tr-session-header">
        <button onClick={onClose} aria-label="Close trail">
          <X size={21} />
        </button>
        <span>{review ? "Back in the mix" : title}</span>
        <span className="tr-session-xp">
          <Sparkles size={14} />
          {xp} XP
        </span>
      </header>
      <progress
        className="tr-session-progress"
        value={done ? questions.length : index}
        max={questions.length}
        aria-label="Trail progress"
      />
      {(error || continuationError) && (
        <p role="alert" className="bz-error">
          {error || continuationError}
        </p>
      )}
      <div
        ref={body}
        className={`tr-session-body ${done ? "tr-session-done" : ""} ${feedback ? "tr-session-feedback" : ""} ${compact ? "tr-session-compact" : ""}`}
      >
        {done ? (
          <>
            <span className="tr-finish-symbol">
              <Sparkles size={36} />
            </span>
            <p className="tr-kicker">CURIOSITY ADDS UP</p>
            <h1 id="trivia-session-title">
              A few more things
              <br />
              you know.
            </h1>
            <div className="tr-finish-stats">
              <span>
                <strong>+{xp}</strong>XP earned
              </span>
              <span>
                <strong>
                  {known}/{questions.length}
                </strong>
                knew this time
              </span>
            </div>
            <p className="tr-session-copy">
              {user
                ? "Your progress is saved."
                : "Saved on this device. Create an account whenever you like."}{" "}
              Keep following the thread.
            </p>
            {related.length > 0 && (
              <div className="tr-related">
                <p className="tr-kicker">WHERE THIS COULD TAKE YOU</p>
                {related.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    disabled={loading}
                    onClick={() => onContinue(t.id)}
                  >
                    {t.title}
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : feedback ? (
          <>
            <p className="tr-kicker">
              {feedback.correct ? "YOU KNEW THAT" : "ONE TO KEEP"}
            </p>
            <span
              className={`tr-answer-mark ${feedback.correct ? "" : "tr-answer-new"}`}
            >
              {feedback.correct ? <Check size={23} /> : <Lightbulb size={23} />}
            </span>
            <h1 id="trivia-session-title">{feedback.answer}</h1>
            <p className="tr-feedback-question">{q.text}</p>
            {explanation && <p className="tr-fact-context">{explanation}</p>}
            <div className="tr-feedback-meta">
              <span>
                {feedback.xp
                  ? `+${feedback.xp} XP`
                  : feedback.correct
                    ? "Already in your knowledge bank"
                    : "We will bring this one back"}
              </span>
              <span className="tr-source-links">
                <a href={feedback.source} target="_blank" rel="noreferrer">
                  {feedback.source === "https://opentdb.com/"
                    ? "Open Trivia DB"
                    : "Source"}
                  <ExternalLink size={12} />
                </a>
                {feedback.source === "https://opentdb.com/" && (
                  <a
                    href="https://creativecommons.org/licenses/by-sa/4.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY-SA 4.0
                  </a>
                )}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="tr-question-meta">
              <span>{q.category || q.subject || "Trivia"}</span>
              <span>
                {index + 1} of {questions.length}
              </span>
            </div>
            <h1 id="trivia-session-title">{q.text}</h1>
            <div className="tr-trivia-choices">
              {q.choices.map((choice, i) => (
                <button
                  key={choice}
                  disabled={busy}
                  onClick={() => void answer(choice)}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {choice}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <footer className="tr-session-footer">
        {done ? (
          <>
            <button
              className="tr-button tr-button-ink"
              disabled={loading}
              onClick={() => onContinue()}
            >
              {loading ? "Finding more..." : "Keep exploring"}
              <ArrowRight size={18} />
            </button>
            <button className="tr-text-button" onClick={onClose}>
              Back to my trails
            </button>
            {!user && (
              <Link href="/signup" onClick={onClose}>
                Save across devices
              </Link>
            )}
          </>
        ) : feedback ? (
          <button className="tr-button tr-button-ink" onClick={next}>
            {index + 1 === questions.length
              ? "See my progress"
              : "Next connection"}
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            className="tr-text-button"
            disabled={busy}
            onClick={() => void answer("__discover__")}
          >
            {busy ? "Checking..." : "I don't know yet"}
            <Lightbulb size={16} />
          </button>
        )}
      </footer>
    </dialog>
  );
}
