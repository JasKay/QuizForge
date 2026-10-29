"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Volume2 } from "lucide-react";
import type { RoomState } from "@/lib/room-types";
type Recognition = {
  lang: string;
  onresult:
    ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
export function RoomUltimate({
  room: r,
  send,
  disabled,
  remaining,
}: {
  room: RoomState;
  send: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  disabled: boolean;
  remaining: number;
}) {
  const [answer, setAnswer] = useState(""),
    [listening, setListening] = useState(false),
    [audioBlocked, setAudioBlocked] = useState(false),
    [voiceError, setVoiceError] = useState("");
  const recognition = useRef<Recognition | null>(null),
    sequence = useRef(r.ultimate_sequence);
  sequence.current = r.ultimate_sequence;
  const active =
    r.members.find((m) => m.id === r.me)?.team === r.ultimate_team &&
    r.my_role !== "spectator";
  function narrate() {
    if (!r.ultimate_question || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(r.ultimate_question.text);
    u.lang = "en-US";
    u.onstart = () => setAudioBlocked(false);
    u.onerror = () => setAudioBlocked(true);
    window.speechSynthesis.speak(u);
  }
  useEffect(() => {
    setAnswer("");
    setAudioBlocked(false);
    recognition.current?.abort();
    narrate();
    return () => {
      window.speechSynthesis?.cancel();
      recognition.current?.abort();
    };
  }, [r.ultimate_sequence, r.ultimate_question?.id]);
  async function speak() {
    const w = window as Window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) {
      setVoiceError(
        "Voice recognition is unavailable here. Type your answer instead.",
      );
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new Constructor();
    recognition.current = rec;
    const expected = r.ultimate_sequence;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      if (sequence.current === expected) {
        const value = e.results[0]?.[0]?.transcript;
        if (value)
          void send("answer_ultimate", { answer: value, sequence: expected });
      }
    };
    rec.onerror = () =>
      setVoiceError(
        "Could not hear an answer. Check microphone access or type instead.",
      );
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
      setVoiceError("");
    } catch {
      setListening(false);
      setVoiceError("Could not start microphone. Type your answer instead.");
    }
  }
  return (
    <section className="hcasc-final" aria-label="Team Ultimate Challenge">
      <p className="overline">ROUND 4 · TEAM {r.ultimate_team}</p>
      <h2>Ultimate Challenge</h2>
      {r.hcasc_phase === "ultimate_pick" ? (
        <>
          <p>
            {active
              ? "Choose your theme. Your 60 seconds begin immediately."
              : `Team ${r.ultimate_team} is choosing a theme.`}{" "}
            Ten questions, 50 points each. Misses and passes recycle.
          </p>
          <div className="hcasc-final-packs">
            {r.final_categories?.map((p) => (
              <button
                key={p.id}
                disabled={!active || disabled || !!p.selected_by}
                onClick={() => void send("pick_ultimate", { pack: p.id })}
              >
                <strong>{p.title}</strong>
                <small>
                  {p.selected_by
                    ? `Played by Team ${p.selected_by}`
                    : p.description}
                </small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="hcasc-final-clock">
            <strong role="timer">{remaining}s</strong>
            <span>{r.ultimate_cleared}/10 cleared</span>
          </div>
          <p>
            {active
              ? "Confer together. The first submitted answer counts."
              : `Watch Team ${r.ultimate_team} take their turn.`}
          </p>
          <h3>{r.ultimate_question?.text}</h3>
          <button className="trivia-secondary" onClick={narrate}>
            <Volume2 size={16} />
            {audioBlocked ? "Tap to hear question" : "Read question again"}
          </button>
          {r.ultimate_feedback && (
            <p role="status">
              {r.ultimate_feedback.passed
                ? "Passed — coming back around"
                : r.ultimate_feedback.correct
                  ? "Correct · +50"
                  : "Missed — coming back around"}
            </p>
          )}
          {active && (
            <form
              className="hcasc-answer"
              onSubmit={(e) => {
                e.preventDefault();
                void send("answer_ultimate", {
                  answer,
                  sequence: r.ultimate_sequence,
                });
              }}
            >
              <label htmlFor="ultimate-team-answer">Team answer</label>
              <input
                id="ultimate-team-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={500}
                disabled={disabled || !remaining}
              />
              <button
                className="trivia-primary"
                disabled={disabled || !answer.trim() || !remaining}
              >
                Answer
              </button>
              <div className="hcasc-final-controls">
                <button
                  type="button"
                  className="trivia-secondary"
                  disabled={disabled || !remaining || listening}
                  onClick={() => void speak()}
                >
                  <Mic size={16} />
                  {listening ? "Listening…" : "Speak answer"}
                </button>
                <button
                  type="button"
                  className="trivia-secondary"
                  disabled={disabled || !remaining}
                  onClick={() =>
                    void send("answer_ultimate", {
                      answer: "",
                      pass: true,
                      sequence: r.ultimate_sequence,
                    })
                  }
                >
                  Pass
                </button>
              </div>
              {voiceError && <p role="status">{voiceError}</p>}
            </form>
          )}
        </>
      )}
    </section>
  );
}
