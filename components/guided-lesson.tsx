"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  X,
} from "lucide-react";
import { playSound, unlockSound } from "@/lib/game";
export type GuidedQuestion = {
  id: string;
  text: string;
  choices: string[];
  source: string;
  application?: { id: string; text: string; choices: string[] };
  study: {
    answer: string;
    explanation: string;
    teaching?: {
      heading: string;
      connection: string;
      hint: string;
      cue: string;
      example?: string;
      diagram?: { parts: number; filled: number };
    } | null;
  } | null;
};
export type GuidedFeedback = {
  xp?: number;
  correct: boolean;
  answer: string;
  explanation: string;
  source: string;
};
export function GuidedLesson({
  title,
  questions,
  review,
  user,
  onAnswer,
  onComplete,
  onClose,
  screenOverlay,
}: {
  title: string;
  questions: GuidedQuestion[];
  review: boolean;
  user: boolean;
  onAnswer: (q: GuidedQuestion, answer: string) => Promise<GuidedFeedback>;
  onComplete: () => void;
  onClose: () => void;
  screenOverlay?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const chosen = questions.slice(0, 3);
  const [phase, setPhase] = useState<
      "welcome" | "discover" | "choose" | "recall" | "done"
    >(review ? "recall" : "welcome"),
    [index, setIndex] = useState(0),
    [queue, setQueue] = useState(chosen.map((_, i) => i)),
    [recalled, setRecalled] = useState<number[]>([]),
    [retries, setRetries] = useState<Record<number, number>>({}),
    [feedback, setFeedback] = useState<GuidedFeedback | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState(""),
    [help, setHelp] = useState(false),
    [attempts, setAttempts] = useState(0),
    [xp, setXp] = useState(0);
  const original = chosen[phase === "recall" ? (queue[0] ?? 0) : index];
  const q =
    phase === "recall" && original?.application
      ? { ...original, ...original.application }
      : original;
  const teaching = original?.study?.teaching;
  const conceptual = chosen.some((q) => q.application);
  useEffect(() => {
    ref.current?.showModal();
    return () => {
      window.speechSynthesis?.cancel();
      ref.current?.close();
    };
  }, []);
  const total = (review ? 0 : chosen.length * 2) + chosen.length,
    completed =
      phase === "welcome"
        ? 0
        : phase === "discover"
          ? index * 2
          : phase === "choose"
            ? index * 2 + 1
            : (review ? 0 : chosen.length * 2) +
              Math.min(chosen.length, attempts);
  async function submit(value: string) {
    if (busy || feedback || !value.trim()) return;
    setBusy(true);
    setError("");
    unlockSound();
    try {
      const result = await onAnswer(q, value.trim());
      setFeedback(result);
      setXp((n) => n + (result.xp || 0));
      playSound(result.correct ? "correct" : "miss");
      if (phase === "recall" && result.correct && !help)
        setRecalled((old) =>
          old.includes(queue[0]) ? old : [...old, queue[0]],
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not check your answer. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function advance() {
    setFeedback(null);
    setAnswer("");
    setHelp(false);
    if (phase === "choose") {
      if (index + 1 < chosen.length) {
        setIndex(index + 1);
        setPhase("discover");
      } else setPhase("recall");
      return;
    }
    const current = queue[0],
      next = queue.slice(1);
    if ((!feedback?.correct || help) && (retries[current] || 0) < 1) {
      next.push(current);
      setRetries((old) => ({ ...old, [current]: (old[current] || 0) + 1 }));
    }
    setQueue(next);
    setAttempts((n) => n + 1);
    if (!next.length) {
      setPhase("done");
      onComplete();
    }
  }
  function speak() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(
        `${conceptual ? q.text : teaching?.heading || q.text}. ${teaching?.connection || q.study?.answer || ""}`,
      ),
    );
  }
  return (
    <dialog
      ref={ref}
      className="bz-guided-lesson"
      aria-labelledby="bz-lesson-title"
      onCancel={onClose}
    >
      <header className="bz-lesson-header">
        <button onClick={onClose} aria-label="Close lesson">
          <X size={23} />
        </button>
        <progress
          value={phase === "done" ? total : completed}
          max={total}
          aria-label="Lesson progress"
        />
        <span>
          {phase === "done"
            ? "Nice work"
            : phase === "welcome"
              ? "Let’s begin"
              : phase === "recall"
                ? "Recall"
                : "Learn"}
        </span>
      </header>
      {error && (
        <p className="bz-lesson-error" role="alert">
          {error}
        </p>
      )}
      <div className={`bz-lesson-body ${feedback ? "bz-show-feedback" : ""}`}>
        {phase === "welcome" ? (
          <>
            <span className="bz-lesson-emblem">
              <BookOpen size={37} />
            </span>
            <p className="bz-eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p>
            <h1 id="bz-lesson-title">{title}</h1>
            <p className="bz-lesson-support">
              {conceptual ? "Three useful ideas." : "Three connections."}
              <br />
              {conceptual
                ? "Understand them. Try them. Use them."
                : "Meet them, try them, then recall them."}
            </p>
            <div className="bz-lesson-promise">
              <span>
                <Lightbulb size={19} />
                Learn
              </span>
              <i />
              <span>
                <Target size={19} />
                Try
              </span>
              <i />
              <span>
                <Sparkles size={19} />
                Remember
              </span>
            </div>
          </>
        ) : phase === "done" ? (
          <>
            <span className="bz-lesson-emblem bz-lesson-complete">
              <Check size={39} />
            </span>
            <p className="bz-eyebrow">A FEW MINUTES WELL SPENT</p>
            <h1 id="bz-lesson-title">A little wiser.</h1>
            <p className="bz-lesson-support">
              {conceptual ? "You applied" : "You recalled"}{" "}
              <strong>
                {recalled.length} of {chosen.length}
              </strong>
              <br />
              without the choices.
            </p>
            <div className="bz-earned-xp">
              <Sparkles size={18} />
              {xp} XP earned
            </div>
            <div className="bz-completion-note">
              {recalled.length === chosen.length
                ? "You made those connections your own. Let them settle, then revisit them."
                : "Every attempt helps. We’ll bring the tricky connections back for another try."}
            </div>
          </>
        ) : feedback ? (
          <>
            <span
              className={`bz-feedback-mark ${feedback.correct ? "" : "bz-feedback-gentle"}`}
            >
              {feedback.correct ? <Check size={31} /> : <Lightbulb size={31} />}
            </span>
            <p className="bz-eyebrow">
              {feedback.correct
                ? "THAT’S THE CONNECTION"
                : "LET’S KEEP THIS ONE TOGETHER"}
            </p>
            <h1 id="bz-lesson-title">
              {feedback.correct ? "You’ve got it." : "A good one to remember."}
            </h1>
            <div className="bz-answer-connection">
              <span>{conceptual ? q.text : teaching?.heading || q.text}</span>
              <ArrowRight size={20} />
              <strong>
                {conceptual
                  ? feedback.answer
                  : teaching?.connection || feedback.answer}
              </strong>
            </div>
            <p className="bz-coach-tip">
              {conceptual
                ? feedback.explanation
                : teaching?.hint || feedback.explanation}
            </p>
            {!!feedback.xp && (
              <p className="bz-xp-feedback">
                +{feedback.xp} XP · New understanding
              </p>
            )}
            {phase === "recall" &&
              (!feedback.correct || help) &&
              (retries[queue[0]] || 0) < 1 && (
                <p className="bz-retry-note">
                  <RotateCcw size={16} />
                  You’ll try this connection again shortly.
                </p>
              )}
          </>
        ) : phase === "discover" ? (
          <>
            <p className="bz-eyebrow">
              {teaching?.cue || "A CONNECTION TO KEEP"}
            </p>
            <h1 id="bz-lesson-title" className="bz-discover-heading">
              {teaching?.heading || q.text}
            </h1>
            {teaching?.diagram && (
              <div
                className="bz-fraction-diagram"
                role="img"
                aria-label={`${teaching.diagram.filled} of ${teaching.diagram.parts} equal parts shaded`}
              >
                {Array.from({ length: teaching.diagram.parts }, (_, i) => (
                  <span
                    key={i}
                    className={i < teaching.diagram!.filled ? "filled" : ""}
                  />
                ))}
              </div>
            )}
            <span className="bz-connection-arrow" aria-hidden="true">
              ↓
            </span>
            <div className="bz-discover-answer">
              {teaching?.connection || q.study?.answer}
            </div>
            <p className="bz-coach-tip">
              {teaching?.example || teaching?.hint || q.study?.explanation}
            </p>
            <button className="bz-listen" onClick={speak}>
              <Volume2 size={18} />
              Hear the connection
            </button>
          </>
        ) : (
          <>
            <p className="bz-eyebrow">
              {phase === "recall"
                ? conceptual
                  ? "USE IT IN A NEW SITUATION"
                  : "NOW, FROM MEMORY"
                : "LET’S MAKE IT CLICK"}
            </p>
            <h1 id="bz-lesson-title" className="bz-quiz-heading">
              {q.text}
            </h1>
            {phase === "recall" && !help ? (
              <form
                id="bz-recall-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(answer);
                }}
              >
                <label htmlFor="bz-recall-answer">Your answer</label>
                <input
                  id="bz-recall-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Take your time…"
                  autoComplete="off"
                  maxLength={200}
                />
                <button
                  className="bz-recall-help"
                  type="button"
                  onClick={() => setHelp(true)}
                >
                  A little help? Show choices
                </button>
              </form>
            ) : (
              <div className="bz-guided-choices">
                {q.choices.map((choice, i) => (
                  <button
                    key={choice}
                    disabled={busy}
                    onClick={() => void submit(choice)}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {choice}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <footer className="bz-lesson-footer">
        {phase === "welcome" ? (
          <button className="bz-primary" onClick={() => setPhase("discover")}>
            Let’s begin
            <ArrowRight size={19} />
          </button>
        ) : phase === "done" ? (
          <>
            <button className="bz-primary" onClick={onClose}>
              Keep exploring
              <ArrowRight size={19} />
            </button>
            <p>
              {user
                ? "Progress saved to your account."
                : "Progress saved on this device."}
              {!user && (
                <>
                  {" "}
                  <Link href="/signup">Create an account anytime</Link>
                </>
              )}
            </p>
          </>
        ) : feedback ? (
          <button className="bz-primary" onClick={advance}>
            Continue
            <ArrowRight size={19} />
          </button>
        ) : phase === "discover" ? (
          <button className="bz-primary" onClick={() => setPhase("choose")}>
            Got it. Let’s try.
            <ArrowRight size={19} />
          </button>
        ) : phase === "recall" && !help ? (
          <button
            className="bz-primary"
            type="submit"
            form="bz-recall-form"
            disabled={busy || !answer.trim()}
          >
            {busy ? "Checking…" : "Check answer"}
            <ArrowRight size={19} />
          </button>
        ) : (
          <p className="bz-lesson-encouragement">
            {busy
              ? "Checking your answer…"
              : "Think it through. You’ve got time."}
          </p>
        )}
      </footer>
    </dialog>
  );
}
