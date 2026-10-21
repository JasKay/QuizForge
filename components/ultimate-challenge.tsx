"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trophy, SkipForward } from "lucide-react";
import { ultimatePacks, type UltimatePack } from "@/lib/ultimate-packs";
import {
  createUltimateRun,
  advanceUltimate,
  ultimateScore,
  type UltimateRun,
} from "@/lib/ultimate";
import { choicesForQuestion, questionStem } from "@/lib/choices";
import { isCorrect } from "@/lib/scoring";
import { AnswerChoices } from "./answer-choices";
export function UltimateChallenge() {
  const [pack, setPack] = useState<UltimatePack | null>(null),
    [phase, setPhase] = useState<"topics" | "playing" | "finished">("topics"),
    [run, setRun] = useState<UltimateRun>(createUltimateRun),
    [remaining, setRemaining] = useState(60),
    [locked, setLocked] = useState(false),
    [notice, setNotice] = useState("");
  const current = useRef(run),
    deadline = useRef(0),
    saved = useRef(false),
    busy = useRef(false),
    advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function finish() {
    if (saved.current) return;
    saved.current = true;
    setPhase("finished");
    busy.current = false;
    setLocked(false);
    try {
      const old = JSON.parse(
        localStorage.getItem("qf-ultimate-history") || "[]",
      );
      localStorage.setItem(
        "qf-ultimate-history",
        JSON.stringify(
          [
            {
              topic: pack?.id,
              score: ultimateScore(current.current),
              correct: current.current.cleared.length,
              at: new Date().toISOString(),
            },
            ...(Array.isArray(old) ? old : []),
          ].slice(0, 20),
        ),
      );
    } catch {}
  }
  function start(topic: UltimatePack) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const fresh = createUltimateRun();
    current.current = fresh;
    setRun(fresh);
    setPack(topic);
    setRemaining(60);
    setNotice("");
    setLocked(false);
    busy.current = false;
    saved.current = false;
    deadline.current = Date.now() + 60000;
    setPhase("playing");
  }
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => {
      const n = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(n);
      if (!n) finish();
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, pack?.id]);
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );
  function respond(value: string | null) {
    if (busy.current || phase !== "playing" || !pack) return;
    if (Date.now() >= deadline.current) {
      finish();
      return;
    }
    const index = current.current.queue[0],
      q = pack.questions[index];
    if (!q) return;
    busy.current = true;
    setLocked(true);
    const ok =
      value !== null && isCorrect(value, [q.answer, ...q.alternatives]);
    const next = advanceUltimate(current.current, index, ok);
    current.current = next;
    setNotice(
      value === null
        ? "Passed — it will come back."
        : ok
          ? "Correct · +25 points"
          : "Not quite — it will come back.",
    );
    if (!next.queue.length) {
      setRun(next);
      finish();
      return;
    }
    advanceTimer.current = setTimeout(() => {
      setRun(next);
      setLocked(false);
      busy.current = false;
    }, 300);
  }
  if (phase === "topics" || !pack)
    return (
      <section className="ultimate-picker">
        <Link className="ultimate-back" href="/dashboard">
          <ArrowLeft size={17} />
          Lobby
        </Link>
        <h1>Ultimate Challenge</h1>
        <p>One topic. Ten questions. Sixty seconds.</p>
        <div className="ultimate-topic-grid">
          {ultimatePacks.map((p) => (
            <button key={p.id} onClick={() => start(p)}>
              <strong>{p.title}</strong>
              <span>{p.description}</span>
              <small>10 questions · 250 points</small>
            </button>
          ))}
        </div>
        <p className="ultimate-format">
          25 points per correct answer. Passes and misses return while time
          remains.{" "}
          <a
            href="https://ffl.hcasc.com/pub/gamerules.asp"
            target="_blank"
            rel="noreferrer"
          >
            Format guide
          </a>
        </p>
      </section>
    );
  if (phase === "finished")
    return (
      <section className="ultimate-results">
        <Trophy size={45} />
        <p>{pack.title}</p>
        <h1 className="ultimate-score">{ultimateScore(run)} / 250</h1>
        <p>
          {run.cleared.length} of 10 cleared
          {run.cleared.length === 10 ? " — clean sweep!" : "."}
        </p>
        <button className="game-button primary" onClick={() => start(pack)}>
          Try again
        </button>
        <button
          className="game-button secondary"
          onClick={() => setPhase("topics")}
        >
          Choose another topic
        </button>
        <details>
          <summary>Review the ten answers</summary>
          {pack.questions.map((q) => (
            <article key={q.id}>
              <p>{questionStem(q.text)}</p>
              <strong>{q.answer}</strong>
              <a href={q.source} target="_blank" rel="noreferrer">
                Reference ↗
              </a>
            </article>
          ))}
        </details>
      </section>
    );
  const q = pack.questions[run.queue[0]];
  return (
    <section className="ultimate-game" data-focus="true">
      <header>
        <button
          onClick={() => {
            if (advanceTimer.current) clearTimeout(advanceTimer.current);
            setPhase("topics");
          }}
        >
          <ArrowLeft size={18} />
          Exit
        </button>
        <strong>{pack.title}</strong>
        <span
          className={remaining < 10 ? "urgent" : ""}
          role="timer"
          aria-label="Time remaining"
        >
          {remaining}s
        </span>
      </header>
      <div className="ultimate-progress">
        <span>{run.cleared.length} / 10 cleared</span>
        <strong>{ultimateScore(run)} pts</strong>
      </div>
      <div className="ultimate-stage">
        <span className="ultimate-qnumber">
          Question {run.queue[0] + 1} of 10
        </span>
        <h1>{questionStem(q.text)}</h1>
        <AnswerChoices
          options={choicesForQuestion(q, pack.questions)}
          disabled={locked}
          onChoose={(v) => respond(v)}
        />
        <div className="ultimate-controls">
          <p role="status" aria-live="polite">
            {notice || "Choose an answer, or pass."}
          </p>
          <button onClick={() => respond(null)} disabled={locked}>
            <SkipForward size={17} />
            Pass
          </button>
        </div>
      </div>
    </section>
  );
}
