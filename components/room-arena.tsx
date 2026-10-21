"use client";
import { useEffect, useRef, useState } from "react";
import {
  Users,
  Radio,
  Eye,
  Share2,
  Copy,
  Check,
  ArrowRight,
  LogOut,
  Zap,
  Trophy,
  RotateCcw,
  Timer,
  WifiOff,
  BookOpen,
} from "lucide-react";
import type { RoomState } from "@/lib/room-types";
import { RoomVoice, SharedVoice } from "./room-voice";
import { playSound } from "@/lib/game";
type Props = {
  room: RoomState;
  send: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  connected: boolean;
};
export function RoomArena({ room: r, send, busy, connected }: Props) {
  const [answer, setAnswer] = useState(""),
    [remaining, setRemaining] = useState(0),
    [copied, setCopied] = useState(false),
    [reading, setReading] = useState(false),
    [voiceReady, setVoiceReady] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    clockOffset = useRef(0),
    previousWinner = useRef<string | null>(null);
  const host = r.my_role === "moderator",
    player = r.my_role === "player",
    myBuzz = r.winner === r.me,
    winner = r.members.find((m) => m.id === r.winner),
    players = r.members.filter((m) => m.role === "player"),
    moderator = r.members.find((m) => m.role === "moderator");
  useEffect(() => {
    clockOffset.current = Date.parse(r.server_time) - Date.now();
  }, [r.server_time]);
  useEffect(() => {
    setAnswer("");
    if (r.status === "locked" && myBuzz && !voiceReady) input.current?.focus();
  }, [r.index, r.status, myBuzz, voiceReady]);
  useEffect(() => {
    if (r.winner && r.winner !== previousWinner.current) playSound("buzz");
    previousWinner.current = r.winner;
  }, [r.winner]);
  useEffect(() => {
    const tick = () => {
      const started = r.status === "locked" ? r.locked_at : r.opened_at;
      const duration = r.status === "locked" ? 5 : r.seconds;
      setRemaining(
        started
          ? Math.max(
              0,
              Math.ceil(
                (Date.parse(started) +
                  duration * 1000 -
                  Date.now() -
                  clockOffset.current) /
                  1000,
              ),
            )
          : duration,
      );
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [r.status, r.opened_at, r.locked_at, r.seconds]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        r.status === "open" &&
        r.armed &&
        player &&
        connected &&
        !busy &&
        remaining > 0 &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        void send("buzz");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [r.status, r.armed, player, connected, busy, remaining, send]);
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  async function share(watch = false) {
    const url = `${window.location.origin}/rooms?code=${r.code}${watch ? "&watch=1" : ""}`;
    try {
      if (navigator.share && !watch)
        await navigator.share({
          title: `${r.title} · QuizForge`,
          text: "Join our team practice. Same question, every phone.",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        window.prompt("Copy this room link", url);
      }
    }
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(r.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy the room code", r.code);
    }
  }
  return (
    <div
      className="room-arena"
      data-focus={r.status !== "waiting" && r.status !== "finished"}
      data-phase={r.status}
      data-voice={voiceReady}
    >
      <div className="room-topbar">
        <div>
          <span className={`room-live ${connected ? "" : "disconnected"}`}>
            {connected ? <Radio size={12} /> : <WifiOff size={12} />}{" "}
            {connected ? "SHARED ROOM" : "RECONNECTING"}
          </span>
          <h1>{r.title}</h1>
        </div>
        <div className="room-focus-context">
          <span>
            Question {r.index} / {r.total}
          </span>
          <strong>
            {player
              ? (r.members.find((m) => m.id === r.me)?.score || 0) + " pts"
              : host
                ? "Moderator"
                : "Watching"}
          </strong>
        </div>
        <details className="focus-score-menu">
          <summary>Scores</summary>
          <Roster room={r} />
        </details>
        <button
          className="room-leave"
          disabled={busy}
          onClick={() => {
            if (!host || window.confirm("End this room for everyone?"))
              void send("leave");
          }}
        >
          <LogOut size={17} />
          {host ? "End room" : "Leave"}
        </button>
      </div>
      {!connected && (
        <div className="room-alert" role="status">
          Reconnecting to your team. Controls resume when the room is in sync.
        </div>
      )}
      <div className="room-invite-bar">
        <button
          className="invite-code"
          onClick={copyCode}
          aria-label={`Copy room code ${r.code}`}
        >
          <span>ROOM CODE</span>
          <strong>{r.code}</strong>
          <Copy size={15} />
        </button>
        <button className="game-button secondary" onClick={() => share()}>
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          <span>{copied ? "Copied!" : "Invite team"}</span>
        </button>
      </div>
      <RoomVoice
        room={r}
        send={send}
        connected={connected}
        onReadyChange={setVoiceReady}
      />
      {r.status === "waiting" ? (
        <div className="room-waiting">
          <div className="waiting-stage">
            <div className="waiting-illustration">
              <Users size={58} />
              <span>
                <Radio size={22} />
              </span>
            </div>
            <span className="game-eyebrow">
              GOOD PRACTICE STARTS WITH GOOD COMPANY
            </span>
            <h2>The squad’s assembling.</h2>
            <p>
              Send your room link. Everyone joins on their own device
              <br />
              and sees the same question when the round begins.
            </p>
            <div className="room-rules">
              <span>
                <BookOpen size={14} />
                {r.focus || "Mixed subjects"}
              </span>
              <span>
                <Timer size={14} />
                {r.seconds}s / question
              </span>
              <span>
                +{r.correct_points} correct · {r.incorrect_points} miss
              </span>
            </div>
            {host ? (
              <>
                <button
                  className="game-button primary"
                  disabled={busy || !connected || players.length === 0}
                  onClick={() => void send("start")}
                >
                  {busy ? "Starting…" : "Start practice"}
                  <ArrowRight size={18} />
                </button>
                <small>
                  {players.length
                    ? "Your team is here. Start when everyone is ready."
                    : "Waiting for at least one player to join."}
                </small>
              </>
            ) : (
              <div className="waiting-for-host">
                <span className="waiting-dot" />
                {player ? "You’re in." : "You’re watching."}{" "}
                {moderator?.name || "The moderator"} will start the round.
              </div>
            )}
            <button className="viewer-invite" onClick={() => share(true)}>
              <Eye size={14} />
              Copy a viewer link
            </button>
          </div>
          <Roster room={r} />
        </div>
      ) : r.status === "finished" ? (
        <div className="room-finish">
          <section className="team-results">
            <Trophy size={54} />
            <span className="game-eyebrow">
              BETTER TOGETHER, ROUND AFTER ROUND
            </span>
            <h2>That’s a team effort.</h2>
            <p>{r.total} questions. Shared knowledge. A stronger squad.</p>
            <div className="team-podium">
              {players.map((member, i) => (
                <div key={member.id} className={i === 0 ? "first" : ""}>
                  <span>
                    {i === 0 ? (
                      <Trophy size={19} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <strong>{member.name}</strong>
                  <b>
                    {member.score}
                    <small>PTS</small>
                  </b>
                </div>
              ))}
            </div>
            {host ? (
              <button
                className="game-button primary"
                disabled={busy || !connected}
                onClick={() => void send("start")}
              >
                <RotateCcw size={18} />
                Run another round
              </button>
            ) : (
              <p className="room-host-hint">
                Your moderator can start another round in this room.
              </p>
            )}
          </section>
          <section className="team-review">
            <div className="game-section-heading">
              <h2>Take the knowledge home.</h2>
              <BookOpen size={22} />
            </div>
            <p>
              Review the round together. Talk through the ones that challenged
              the team.
            </p>
            {r.review?.map((q, i) => (
              <details key={i}>
                <summary>
                  <span
                    className={q.correct ? "review-dot correct" : "review-dot"}
                  />
                  <span>
                    <small>{q.subject}</small>
                    {q.question}
                  </span>
                  <span>+</span>
                </summary>
                <div>
                  <strong>{q.answer}</strong>
                  <p>{q.explanation}</p>
                  <a href={q.source} target="_blank" rel="noreferrer">
                    Read the reference ↗
                  </a>
                </div>
              </details>
            ))}
          </section>
        </div>
      ) : (
        <>
          <div className="room-player-scores" aria-label="Team scoreboard">
            {players.map((member) => (
              <div
                key={member.id}
                className={r.winner === member.id ? "buzz-winner" : ""}
              >
                <span className="score-avatar">
                  {member.name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  {member.name}
                  {member.id === r.me && <small>YOU</small>}
                </span>
                <strong>{member.score}</strong>
                {r.winner === member.id && (
                  <Zap size={15} fill="currentColor" />
                )}
              </div>
            ))}
          </div>
          <div className="room-question-layout">
            <section className="room-stage question-stage">
              <div className="question-stage-top">
                <span className="question-subject">
                  {r.question?.subject}
                  <span>✦</span>
                  {r.question?.difficulty}
                </span>
                <span
                  className={`room-clock ${remaining < 10 ? "urgent" : ""}`}
                >
                  <Timer size={17} />
                  {r.status === "open" && !r.armed
                    ? "Reading"
                    : r.status === "resolved"
                      ? "Resolved"
                      : `${remaining}s`}
                </span>
              </div>
              <span className="question-number">
                QUESTION {r.index} OF {r.total}
              </span>
              <h2>{r.question?.text}</h2>
              {r.status === "open" &&
                (host ? (
                  <div className="moderator-stage">
                    <span>
                      <Radio size={18} />
                      Read it out. Let the team buzz.
                    </span>
                    {!r.armed && (
                      <div className="voice-actions">
                        <button
                          className="game-button secondary"
                          disabled={reading || busy}
                          onClick={() => {
                            if (!("speechSynthesis" in window)) return;
                            speechSynthesis.cancel();
                            const speech = new SpeechSynthesisUtterance(
                              r.question?.text || "",
                            );
                            speech.onend = () => setReading(false);
                            speech.onerror = () => setReading(false);
                            setReading(true);
                            speechSynthesis.speak(speech);
                          }}
                        >
                          Read question aloud
                        </button>
                        <button
                          className="game-button primary"
                          disabled={reading || busy || !connected}
                          onClick={() => void send("arm")}
                        >
                          Open buzzers
                        </button>
                      </div>
                    )}
                    <p>
                      First valid buzz gets the floor. Players can type an
                      answer, or you can judge it aloud.
                    </p>
                    <button
                      className="game-button secondary"
                      disabled={busy || !connected}
                      onClick={() => void send("reveal")}
                    >
                      {remaining === 0
                        ? "Time’s up · Reveal answer"
                        : "Skip & reveal answer"}
                    </button>
                  </div>
                ) : player ? (
                  <div className="buzz-zone">
                    <button
                      className="play-buzzer room-buzzer"
                      disabled={
                        busy || !connected || !r.armed || remaining === 0
                      }
                      onClick={() => void send("buzz")}
                      aria-label="Buzz in"
                    >
                      <Zap size={37} fill="currentColor" />
                    </button>
                    <strong>
                      {!r.armed
                        ? "Listen. Buzzers open after reading."
                        : remaining === 0
                          ? "Time’s up. Wait for your moderator."
                          : busy
                            ? "Buzz sent…"
                            : "Tap to buzz."}
                    </strong>
                    <span>
                      Tap to buzz
                      {remaining > 0 && (
                        <>
                          {" "}
                          · or press <kbd>space</kbd>
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="spectator-stage">
                    <Eye size={24} />
                    <strong>Watching this question.</strong>
                    <p>Follow the question and watch the team play.</p>
                  </div>
                ))}
              {r.status === "locked" && (
                <div className="buzz-locked">
                  <div
                    className="buzz-winner-label"
                    role="alert"
                    aria-live="assertive"
                  >
                    <Zap size={20} fill="currentColor" />
                    <strong>
                      {myBuzz
                        ? "Your answer."
                        : `${winner?.name || "A player"} buzzed first.`}
                    </strong>
                    <span>BUZZERS LOCKED</span>
                  </div>
                  {myBuzz && voiceReady && (
                    <p className="voice-floor-notice">
                      Microphone active. Say your answer now.
                    </p>
                  )}
                  {myBuzz ? (
                    <form
                      className="room-answer"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send("answer", { answer });
                      }}
                    >
                      <label htmlFor="room-answer">
                        Your answer
                        <input
                          ref={input}
                          id="room-answer"
                          maxLength={1000}
                          autoComplete="off"
                          placeholder="Back yourself. Lock it in."
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          disabled={busy || !connected || remaining === 0}
                        />
                      </label>
                      <button
                        className="game-button primary"
                        disabled={
                          busy ||
                          !connected ||
                          !answer.trim() ||
                          remaining === 0
                        }
                      >
                        {busy ? "Checking…" : "Lock it in"}
                        <ArrowRight size={17} />
                      </button>
                      <small>5 seconds. One answer.</small>
                    </form>
                  ) : host ? (
                    <div className="judge-controls">
                      <p>
                        {winner?.name} has the floor. Let them type, or judge
                        their spoken answer.
                      </p>
                      <div>
                        <button
                          className="game-button judge-correct"
                          disabled={busy || !connected}
                          onClick={() => void send("judge", { correct: true })}
                        >
                          <Check size={18} />
                          Mark correct
                        </button>
                        <button
                          className="game-button secondary"
                          disabled={busy || !connected}
                          onClick={() => void send("judge", { correct: false })}
                        >
                          Mark incorrect
                        </button>
                      </div>
                      <button
                        className="viewer-invite"
                        disabled={busy || !connected}
                        onClick={() => void send("reveal")}
                      >
                        No answer? Reveal and move on.
                      </button>
                    </div>
                  ) : (
                    <p className="locked-wait">
                      {winner?.name} is answering. Stay sharp for the next one.
                    </p>
                  )}
                </div>
              )}
              <SharedVoice room={r} send={send} disabled={busy || !connected} />
              {r.status === "resolved" && r.result && (
                <div
                  className={`game-feedback ${r.result.correct ? "correct" : "incorrect"}`}
                  role="status"
                >
                  <div className="feedback-head">
                    <span className="feedback-symbol">
                      {r.result.correct ? (
                        <Check size={25} />
                      ) : (
                        <RotateCcw size={24} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {r.result.correct
                          ? "That’s the one!"
                          : "One for the team notebook."}
                      </strong>
                      <span>
                        {winner
                          ? `${winner.name} · ${r.result.correct ? `+${r.correct_points}` : r.incorrect_points} points`
                          : "No buzz this time. Keep learning."}
                      </span>
                    </div>
                  </div>
                  <div className="feedback-explanation">
                    <h3>{r.result.answer}</h3>
                    <p>{r.result.explanation}</p>
                    {r.result.response && (
                      <p className="team-submitted">
                        Response: {r.result.response}
                      </p>
                    )}
                    <a href={r.result.source} target="_blank" rel="noreferrer">
                      Read the reference ↗
                    </a>
                  </div>
                  {host ? (
                    <button
                      className="game-button primary"
                      disabled={busy || !connected}
                      onClick={() => void send("next")}
                    >
                      {r.index === r.total
                        ? "See team results"
                        : "Next question"}
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <p className="room-host-hint">
                      Waiting for {moderator?.name || "your moderator"} to{" "}
                      {r.index === r.total
                        ? "show the final scores"
                        : "open the next question"}
                      .
                    </p>
                  )}
                </div>
              )}
            </section>
            <aside className="room-side-panel">
              <Roster room={r} />
              <p className="room-fairness">
                <Radio size={14} />
                Same question, every device. The server orders buzzes and saves
                the scores.
              </p>
              {host && r.status === "locked" && remaining === 0 && (
                <button
                  className="game-button secondary"
                  disabled={busy || !connected}
                  onClick={() => void send("reveal")}
                >
                  Answer clock expired · Reveal
                </button>
              )}
            </aside>
          </div>
        </>
      )}
      <p className="room-session-note">
        Guest room · Keep this browser to rejoin · Original demonstration
        questions
      </p>
    </div>
  );
}
function Roster({ room }: { room: RoomState }) {
  return (
    <section className="room-roster">
      <div>
        <h3>In the room</h3>
        <span>
          <Users size={14} />
          {room.members.length}
        </span>
      </div>
      {room.members.map((member) => (
        <div className="roster-member" key={member.id}>
          <span>
            {member.role === "moderator" ? (
              <Radio size={16} />
            ) : member.role === "spectator" ? (
              <Eye size={16} />
            ) : (
              member.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <div>
            <strong>
              {member.name}
              {member.id === room.me ? " (you)" : ""}
            </strong>
            <small>
              {member.role === "moderator"
                ? "MODERATOR"
                : member.role === "spectator"
                  ? "VIEWER"
                  : "PLAYER"}
            </small>
          </div>
          {member.role === "player" && <b>{member.score}</b>}
        </div>
      ))}
    </section>
  );
}
