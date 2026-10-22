"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trophy, SkipForward, Mic } from "lucide-react";
import { ultimatePacks, type UltimatePack } from "@/lib/ultimate-packs";
import {
  createUltimateRun,
  advanceUltimate,
  ultimateScore,
  questionsForUltimatePack,
  ULTIMATE_QUESTION_COUNT,
  type UltimateRun,
} from "@/lib/ultimate";
import { questionStem } from "@/lib/choices";
import { playSound } from "@/lib/game";
import { questions } from "@/lib/questions";
import { isSpokenCorrect } from "@/lib/spoken-answer";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult:
    | ((e: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  start: () => void;
  abort: () => void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
function questionSummary(text: string) {
  const words = questionStem(text)
    .replace(/^(?:which|what|who|where|when|why|how)\s+/i, "")
    .split(/\s+/);
  return words.length > 10
    ? words.slice(0, 10).join(" ") + "…"
    : words.join(" ");
}
export function UltimateChallenge() {
  const [pack, setPack] = useState<UltimatePack | null>(null),
    [phase, setPhase] = useState<"topics" | "playing" | "finished">("topics"),
    [run, setRun] = useState<UltimateRun>(createUltimateRun),
    [remaining, setRemaining] = useState(60),
    [locked, setLocked] = useState(false),
    [notice, setNotice] = useState("");
  const [voiceError, setVoiceError] = useState(""),
    [listening, setListening] = useState(false),
    [preparing, setPreparing] = useState(false),
    [retry, setRetry] = useState(0);
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
  async function start(topic: UltimatePack) {
    setVoiceError("");
    const w = window as VoiceWindow;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setVoiceError(
        "Speech recognition is unavailable in this browser. Use a browser with speech recognition enabled.",
      );
      return;
    }
    setPreparing(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      media.getTracks().forEach((t) => t.stop());
    } catch {
      setVoiceError(
        "Microphone access is required. Allow access and try again.",
      );
      setPreparing(false);
      return;
    }
    setPreparing(false);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    let fresh: UltimateRun;
    let selectedPack: UltimatePack;
    try {
      selectedPack = {
        ...topic,
        questions: questionsForUltimatePack(topic, questions),
      };
      fresh = createUltimateRun();
    } catch (error) {
      setVoiceError(
        error instanceof Error ? error.message : "Could not load this topic.",
      );
      setPreparing(false);
      return;
    }
    current.current = fresh;
    setRun(fresh);
    setPack(selectedPack);
    setRemaining(60);
    setNotice("");
    setLocked(false);
    busy.current = false;
    saved.current = false;
    deadline.current = 0;
    setPhase("playing");
  }
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => {
      if (!deadline.current) return;
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
    if (!deadline.current) return;
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
      value !== null && isSpokenCorrect(value, [q.answer, ...q.alternatives]);
    if (value !== null) playSound(ok ? "correct" : "miss");
    const next = advanceUltimate(current.current, index, ok);
    current.current = next;
    setNotice(value === null ? "Passed" : ok ? "Correct +25" : "Incorrect");
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
  const respondRef = useRef(respond);
  respondRef.current = respond;
  useEffect(() => {
    if (phase !== "playing" || locked) return;
    const w = window as VoiceWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    let cancelled = false;
    let restart: ReturnType<typeof setTimeout> | undefined;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart = () => {
      if (cancelled) return;
      if (!deadline.current) deadline.current = Date.now() + 60000;
      setListening(true);
      setVoiceError("");
    };
    rec.onresult = (e) => {
      if (cancelled) return;
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          respondRef.current(e.results[i][0].transcript.trim());
          break;
        }
      }
    };
    rec.onerror = (e) => {
      if (cancelled || e.error === "aborted" || e.error === "no-speech") return;
      cancelled = true;
      setListening(false);
      setVoiceError(
        e.error === "not-allowed"
          ? "Microphone access was denied. Allow access, then retry."
          : "Speech recognition stopped. Check your connection, then retry.",
      );
    };
    const begin = () => {
      if (cancelled || busy.current) return;
      try {
        rec.start();
      } catch {
        setVoiceError(
          "Could not start speech recognition. Tap Retry microphone.",
        );
      }
    };
    rec.onend = () => {
      if (cancelled) return;
      setListening(false);
      if (!busy.current) restart = setTimeout(begin, 200);
    };
    begin();
    return () => {
      cancelled = true;
      clearTimeout(restart);
      rec.abort();
      setListening(false);
    };
  }, [phase, run.attempts, locked, retry]);
  if (phase === "topics" || !pack)
    return (
      <section className="ultimate-picker">
        <div className="page-title">
          <p className="overline">RAPID FIRE</p>
          <h1>
            Ultimate
            <br />
            Challenge
          </h1>
          <p>Say your answers. Pass to skip.</p>
        </div>
        <div className="ultimate-facts">
          <span>
            <strong>{ULTIMATE_QUESTION_COUNT}</strong> questions
          </span>
          <span>
            <strong>60</strong> seconds
          </span>
          <span>
            <strong>{ULTIMATE_QUESTION_COUNT * 25}</strong> points
          </span>
        </div>
        {preparing && <p role="status">Setting up microphone…</p>}
        {voiceError && <p role="alert">{voiceError}</p>}
        <div className="ultimate-topic-grid">
          {ultimatePacks.map((p, i) => (
            <button
              key={p.id}
              disabled={preparing}
              onClick={() => void start(p)}
            >
              <span className="topic-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="ultimate-topic-copy">
                <strong>{p.title}</strong>
                <small>{p.description}</small>
              </span>
              <span className="topic-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>
    );
  if (phase === "finished")
    return (
      <section className="ultimate-results">
        <Trophy size={45} />
        <p>{pack.title}</p>
        <h1 className="ultimate-score">
          {ultimateScore(run)} / {ULTIMATE_QUESTION_COUNT * 25}
        </h1>
        <p>
          {run.cleared.length} of {ULTIMATE_QUESTION_COUNT} cleared
          {run.cleared.length === ULTIMATE_QUESTION_COUNT ? "" : "."}
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
        <span>
          {run.cleared.length} / {ULTIMATE_QUESTION_COUNT} cleared
        </span>
        <strong>{ultimateScore(run)} pts</strong>
      </div>
      <div className="ultimate-stage">
        <span className="ultimate-qnumber">
          {run.queue[0] + 1} / {ULTIMATE_QUESTION_COUNT}
        </span>
        <h1>{questionStem(q.text)}</h1>
        <p className="ultimate-question-summary">
          Quick summary · {questionSummary(q.text)}
        </p>
        <div className="voice-listening" aria-live="polite">
          <Mic size={18} />
          {voiceError
            ? "Microphone stopped"
            : listening
              ? "Listening — say your answer"
              : locked
                ? "Checking answer"
                : "Starting microphone…"}
        </div>
        {voiceError && (
          <div role="alert">
            {voiceError}
            <button
              className="game-button secondary"
              onClick={() => setRetry((v) => v + 1)}
            >
              Retry microphone
            </button>
          </div>
        )}
        <div className="ultimate-controls">
          <p role="status" aria-live="polite">
            {notice || ""}
          </p>
          <button
            onClick={() => respond(null)}
            disabled={locked || !deadline.current}
          >
            <SkipForward size={17} />
            Pass
          </button>
        </div>
      </div>
    </section>
  );
}
