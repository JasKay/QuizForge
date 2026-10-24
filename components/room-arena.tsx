"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Copy, Check, Share2, Zap, ArrowLeft } from "lucide-react";
import type { RoomState } from "@/lib/room-types";
import { QuestionReader } from "./question-reader";
import { AnswerChoices } from "./answer-choices";
import { RoomVoice, SharedVoice } from "./room-voice";
import { playSound } from "@/lib/game";
type Props = {
  room: RoomState;
  send: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  connected: boolean;
};
export function RoomArena({ room: r, send, busy, connected }: Props) {
  const host = r.my_role === "moderator",
    player = r.my_role !== "spectator",
    eligible =
      r.attempt !== 2 ||
      r.members.find((m) => m.id === r.me)?.team === r.steal_team,
    myBuzz = r.winner === r.me,
    active = !["waiting", "finished"].includes(r.status),
    questionPhase = r.mode !== "hcasc" || r.hcasc_phase === "question";
  const [readingLeft, setReadingLeft] = useState(1),
    [readDone, setReadDone] = useState(false);
  const [remaining, setRemaining] = useState(30),
    [roundRemaining, setRoundRemaining] = useState(240),
    [copied, setCopied] = useState(false),
    [voiceReady, setVoiceReady] = useState(false),
    [rosterPage, setRosterPage] = useState(0);
  const lastOutcome = useRef<string | null>(null);
  useEffect(() => {
    if (r.outcome && r.outcome.id !== lastOutcome.current) {
      lastOutcome.current = r.outcome.id;
      playSound(r.outcome.correct ? "correct" : "miss");
    }
  }, [r.outcome?.id, r.outcome?.correct]);
  const previousWinner = useRef<string | null>(null),
    offset = useRef(0);
  const members = r.members.filter((m) => m.role !== "spectator"),
    winner = r.members.find((m) => m.id === r.winner);
  useEffect(() => {
    offset.current = Date.parse(r.server_time) - Date.now();
  }, [r.server_time]);
  useEffect(() => {
    if (
      r.status === "locked" &&
      r.winner &&
      r.winner !== previousWinner.current
    )
      playSound("buzz");
    previousWinner.current = r.winner;
  }, [r.winner, r.status]);
  useEffect(
    () => setReadDone(false),
    [r.question?.id, r.status === "waiting", r.status === "finished"],
  );
  useEffect(() => {
    if (
      readDone &&
      readingLeft <= 0 &&
      questionPhase &&
      host &&
      r.status === "open" &&
      !r.armed &&
      connected &&
      !busy
    )
      void send("arm");
  }, [
    readDone,
    readingLeft,
    questionPhase,
    host,
    r.status,
    r.index,
    r.armed,
    connected,
    busy,
    send,
  ]);
  useEffect(() => {
    const tick = () => {
      setReadingLeft(
        r.read_until
          ? Math.max(
              0,
              Math.ceil(
                (Date.parse(r.read_until) - Date.now() - offset.current) / 1000,
              ),
            )
          : 0,
      );
      const start = r.status === "locked" ? r.locked_at : r.opened_at;
      setRemaining(
        start
          ? Math.max(
              0,
              Math.ceil(
                (Date.parse(start) +
                  (r.status === "locked" ? 5 : r.seconds) * 1000 -
                  Date.now() -
                  offset.current) /
                  1000,
              ),
            )
          : r.seconds,
      );
      setRoundRemaining(
        r.round_ends_at
          ? Math.max(
              0,
              Math.ceil(
                (Date.parse(r.round_ends_at) - Date.now() - offset.current) /
                  1000,
              ),
            )
          : 240,
      );
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [
    r.status,
    r.opened_at,
    r.locked_at,
    r.seconds,
    r.read_until,
    r.round_ends_at,
  ]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        questionPhase &&
        player &&
        eligible &&
        r.status === "open" &&
        r.armed &&
        (readDone || r.attempt === 2) &&
        remaining > 0 &&
        connected &&
        !busy
      ) {
        e.preventDefault();
        void send("buzz");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    player,
    questionPhase,
    eligible,
    r.attempt,
    r.status,
    r.armed,
    readDone,
    remaining,
    connected,
    busy,
    send,
  ]);
  async function share() {
    const url = window.location.origin + "/rooms?code=" + r.code;
    try {
      if (navigator.share) await navigator.share({ title: "Buzzer! room", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          window.prompt("Copy room link", url);
        }
      }
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(r.code);
      setCopied(true);
    } catch {
      window.prompt("Copy room code", r.code);
    }
  }
  const teams = (["A", "B"] as const).map((id) => ({
    id,
    members: members.filter((m) => m.team === id),
    score: r.members
      .filter((m) => m.team === id)
      .reduce((sum, m) => sum + m.score, 0),
  }));
  const balanced =
    teams.every((t) => t.members.length > 0) &&
    Math.abs(teams[0].members.length - teams[1].members.length) <= 1;
  const teamSummary = (
    <div className="team-summary">
      {teams.map((t) => (
        <div key={t.id}>
          <span>Team {t.id}</span>
          <strong>
            {r.status === "waiting"
              ? t.members.length + " players"
              : t.score + " pts"}
          </strong>
        </div>
      ))}
    </div>
  );
  const roster = (
    <div className="compact-roster" aria-label="Players">
      {members.slice(rosterPage * 3, rosterPage * 3 + 3).map((m) => (
        <div key={m.id}>
          <span>
            {m.name}
            {m.id === r.me ? " (you)" : ""}
            {m.role === "moderator" ? " · Host" : ""}
          </span>
          {host && r.status === "waiting" ? (
            <button
              className="team-badge"
              aria-label={
                "Move " + m.name + " to Team " + (m.team === "A" ? "B" : "A")
              }
              disabled={busy}
              onClick={() =>
                void send("assign_team", {
                  member: m.id,
                  team: m.team === "A" ? "B" : "A",
                })
              }
            >
              {m.team || "—"}
              <span>↔</span>
            </button>
          ) : (
            <strong>
              {m.team ? "Team " + m.team : ""} · {m.score}
            </strong>
          )}
        </div>
      ))}
      {members.length > 3 && (
        <button
          onClick={() =>
            setRosterPage((p) => (p + 1) % Math.ceil(members.length / 3))
          }
        >
          Players {rosterPage * 3 + 1}–
          {Math.min(rosterPage * 3 + 3, members.length)} of {members.length} →
        </button>
      )}
    </div>
  );
  return (
    <section
      className="room-arena compact-arena"
      data-focus={active}
      data-phase={r.status}
      data-voice={voiceReady}
    >
      <header className="compact-room-top">
        <button
          aria-label="Leave room"
          onClick={() => {
            if (!host || window.confirm("End this room for everyone?"))
              void send("leave");
          }}
          disabled={busy}
        >
          <ArrowLeft size={18} />
        </button>
        <span>
          {active
            ? r.mode === "hcasc"
              ? "Round " +
                r.round +
                " / 3 · " +
                Math.floor(roundRemaining / 60) +
                ":" +
                String(roundRemaining % 60).padStart(2, "0")
              : r.index + " / " + r.total
            : r.mode === "hcasc"
              ? "HCASC-style game"
              : "Team Room"}
        </span>
        <span>
          {active
            ? "A " + teams[0].score + " · B " + teams[1].score
            : members.length + " players"}
        </span>
      </header>
      {!connected && (
        <p role="status" className="compact-error">
          Reconnecting…
        </p>
      )}
      {r.status === "waiting" && (
        <div className="compact-waiting">
          <div className="page-title">
            <h1>Room ready</h1>
          </div>
          <div className="compact-invite">
            <button
              className="invite-code"
              onClick={copy}
              aria-label={"Copy room code " + r.code}
            >
              <strong>{r.code}</strong>
              <Copy size={15} />
            </button>
            <button className="trivia-secondary" onClick={() => void share()}>
              {copied ? <Check size={16} /> : <Share2 size={16} />}Share link
            </button>
          </div>
          {teamSummary}
          {roster}
        </div>
      )}
      <RoomVoice
        room={r}
        send={send}
        connected={connected}
        onReadyChange={setVoiceReady}
      />
      {r.status === "waiting" &&
        (host ? (
          <button
            className="trivia-primary room-start"
            disabled={busy || !connected || members.length < 2 || !balanced}
            onClick={() =>
              void send(r.mode === "hcasc" ? "start_hcasc" : "start")
            }
          >
            Start game
            <ArrowRight size={18} />
          </button>
        ) : (
          <p className="room-wait-status">Waiting for host to start</p>
        ))}
      {r.status === "waiting" && host && members.length < 2 && (
        <p className="room-wait-status">Share the link to invite a player.</p>
      )}
      {r.status === "waiting" && host && members.length >= 2 && !balanced && (
        <p className="compact-error">
          Balance the teams to start. Tap a player’s team to move them.
        </p>
      )}
      {r.status === "finished" && (
        <div className="compact-finished">
          <div className="page-title">
            <p className="overline">RESULTS</p>
            <h1>
              {r.mode === "hcasc" ? "Tournament complete" : "Round complete"}
            </h1>
          </div>
          {teamSummary}
          {roster}
          {host ? (
            <button
              className="trivia-primary"
              onClick={() =>
                void send(r.mode === "hcasc" ? "start_hcasc" : "start")
              }
              disabled={busy}
            >
              Play again
              <ArrowRight size={18} />
            </button>
          ) : (
            <p className="room-wait-status">Waiting for host</p>
          )}
        </div>
      )}
      {active && (
        <div className="compact-room-game">
          {r.mode === "hcasc" && r.hcasc_phase === "pick" && (
            <section className="hcasc-board" aria-label="Choose a question">
              <div>
                <p className="overline">ROUND {r.round} · FOUR MINUTES</p>
                <h2>
                  {player &&
                  r.members.find((m) => m.id === r.me)?.team === r.pick_team
                    ? "Team " + r.pick_team + ", choose a question"
                    : "Team " + r.pick_team + " is choosing"}
                </h2>
              </div>
              <div className="hcasc-categories">
                {(r.board || []).map((category) => (
                  <div className="hcasc-category" key={category.category}>
                    <h3>{category.category}</h3>
                    {category.slots.map((item) => (
                      <button
                        key={item.slot}
                        disabled={
                          !item.available ||
                          !player ||
                          r.members.find((m) => m.id === r.me)?.team !==
                            r.pick_team ||
                          busy ||
                          !connected ||
                          roundRemaining === 0
                        }
                        onClick={() =>
                          void send("pick", {
                            category: category.category,
                            slot: item.slot,
                          })
                        }
                      >
                        Question {item.slot}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}
          {questionPhase && (
            <>
              {r.status === "open" &&
                r.attempt !== 2 &&
                (!r.armed || !readDone) &&
                r.question && (
                  <QuestionReader
                    key={r.question.id}
                    text={r.question.text}
                    startedAt={r.reading_started_at}
                    endsAt={r.read_until}
                    offset={offset.current}
                    onComplete={() => setReadDone(true)}
                  />
                )}
              {r.status === "open" && (
                <div className="compact-buzz-row">
                  {player ? (
                    <button
                      className="compact-buzzer"
                      disabled={
                        busy ||
                        !connected ||
                        !r.armed ||
                        (!readDone && r.attempt !== 2) ||
                        !eligible ||
                        remaining === 0
                      }
                      onClick={() => void send("buzz")}
                      aria-label="Buzz in"
                    >
                      <Zap size={21} fill="currentColor" />
                      {r.attempt === 2
                        ? eligible
                          ? "Buzz in to steal"
                          : "Team " + r.steal_team + "’s chance"
                        : "Buzz in to answer"}
                    </button>
                  ) : (
                    <span>Watching</span>
                  )}
                  <span className="compact-clock" role="timer">
                    {r.armed ? remaining + "s" : "Ready…"}
                  </span>
                </div>
              )}
              {r.status === "locked" && (
                <div className="compact-buzz-row buzz-winner-label" role="alert">
                  <strong>
                    {myBuzz
                      ? voiceReady
                        ? "You buzzed first · Speak or choose"
                        : "You buzzed first · Choose an answer"
                      : (winner?.name || "Player") + " is answering"}
                  </strong>
                  <span className="compact-clock" role="timer">
                    {remaining}s
                  </span>
                </div>
              )}
              {r.question && (
                <div className="compact-question">
                  <div className="compact-question-content">
                    <span className="question-category">
                      {r.question.subject}
                    </span>
                    <h2>{r.question.text}</h2>
                  </div>
                </div>
              )}
              {r.question && r.status !== "resolved" && (
                <AnswerChoices
                  options={r.question.choices}
                  disabled={
                    r.status !== "locked" || !myBuzz || busy || !connected
                  }
                  onChoose={(answer) => void send("answer", { answer })}
                />
              )}
              {r.status === "resolved" && r.result && (
                <div
                  className={
                    "game-feedback compact-feedback " +
                    (r.result.correct ? "correct" : "incorrect")
                  }
                  role="status"
                >
                  <strong>{r.result.correct ? "Correct" : "Incorrect"}</strong>
                  <p>
                    {r.steal_available
                      ? "Team " + r.steal_team + " has a chance to answer."
                      : r.result.answer}
                  </p>
                </div>
              )}
              <SharedVoice
                room={r}
                send={send}
                disabled={busy || !connected}
              />
              {host && r.status === "resolved" ? (
                <button
                  className="trivia-primary"
                  disabled={busy || !connected}
                  onClick={() =>
                    void send(
                      r.steal_available
                        ? "steal"
                        : r.mode === "hcasc"
                          ? "next_hcasc"
                          : "next",
                    )
                  }
                >
                  {r.steal_available
                    ? "Pass to Team " + r.steal_team
                    : r.mode === "hcasc"
                      ? "Return to question board"
                      : r.index === r.total
                        ? "Results"
                        : "Next question"}
                  <ArrowRight size={18} />
                </button>
              ) : host &&
                r.status === "open" &&
                questionPhase ? (
                <button
                  className="room-skip"
                  disabled={busy || !connected}
                  onClick={() => void send("reveal")}
                >
                  Skip question
                </button>
              ) : r.status === "resolved" ? (
                <p className="room-wait-status">
                  {r.steal_available
                    ? "Waiting for Team " + r.steal_team + "’s chance"
                    : "Waiting for next question"}
                </p>
              ) : null}
            </>
          )}
        </div>
      )}
    </section>
  );
}
