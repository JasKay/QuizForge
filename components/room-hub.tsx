"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ArrowRight,
  Radio,
  KeyRound,
  Eye,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { subjects } from "@/lib/questions";
import type { RoomState } from "@/lib/room-types";
import { RoomArena } from "./room-arena";
export function RoomHub() {
  const router = useRouter(),
    [available, setAvailable] = useState<boolean | null>(null),
    [room, setRoom] = useState<RoomState | null>(null),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [title, setTitle] = useState("Team practice"),
    [focus, setFocus] = useState(""),
    [count, setCount] = useState(10),
    [seconds, setSeconds] = useState(30),
    [correct, setCorrect] = useState(10),
    [incorrect, setIncorrect] = useState(0),
    [watch, setWatch] = useState(false),
    [tab, setTab] = useState<"join" | "host">("join"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(true);
  const pending = useRef(false);
  const accept = useCallback((value: RoomState) => {
    setRoom((old) =>
      !old || old.code !== value.code || value.version >= old.version
        ? value
        : old,
    );
    setConnected(true);
    setCode(value.code);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search),
      invite = (params.get("code") || "").toUpperCase();
    setCode(invite);
    setWatch(params.get("watch") === "1");
    if (params.get("host") === "1") setTab("host");
    try {
      setName(localStorage.getItem("qf-room-name") || "");
    } catch {}
    let active = true;
    fetch("/api/rooms?config=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (active) setAvailable(data.available);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    if (invite)
      fetch(`/api/rooms?code=${encodeURIComponent(invite)}`, {
        cache: "no-store",
      })
        .then(async (r) => {
          const data = await r.json();
          if (r.ok && active) accept(data.room);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [accept]);
  useEffect(() => {
    if (!room?.code) return;
    let live = true,
      timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    async function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, 2500);
        return;
      }
      controller = new AbortController();
      try {
        const response = await fetch(`/api/rooms?code=${room!.code}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!live) return;
        if (response.ok) {
          accept(data.room);
          setError("");
        } else if (
          response.status === 401 ||
          /not found|expired/i.test(data.error || "")
        ) {
          setRoom(null);
          setError(data.error);
        } else setConnected(false);
      } catch {
        if (live) setConnected(false);
      }
      if (live) timer = setTimeout(poll, 1200);
    }
    timer = setTimeout(poll, 500);
    const visible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void poll();
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      live = false;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [room?.code, accept]);
  async function send(action: string, extra: Record<string, unknown> = {}) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code: room?.code || code,
          index: room?.index || 0,
          ...extra,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Could not update the room. Try again.");
      if (data.left) {
        setRoom(null);
        setCode("");
        router.replace("/rooms", { scroll: false });
        return;
      }
      accept(data.room);
      if (action === "create" || action === "join") {
        localStorage.setItem("qf-room-name", name);
        localStorage.setItem("qf-last-room", data.room.code);
        router.replace(`/rooms?code=${data.room.code}`, { scroll: false });
      }
    } catch (e) {
      setError((e as Error).message);
      if (room)
        try {
          const response = await fetch(`/api/rooms?code=${room.code}`, {
            cache: "no-store",
          });
          if (response.ok) accept((await response.json()).room);
        } catch {
          setConnected(false);
        }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="room-hub">
      {error && (
        <div className="room-alert" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {room ? (
        <RoomArena room={room} send={send} busy={busy} connected={connected} />
      ) : (
        <>
          <div className="team-intro">
            <span className="game-eyebrow">
              <Radio size={15} /> THE WHOLE SQUAD. EVERY SCREEN.
            </span>
            <h1>
              Train together.
              <br />
              <span>Win together.</span>
            </h1>
            <p>
              One room. The same question on every phone.
              <br />
              Buzz first, back your answer, build your team’s edge.
            </p>
            <div className="team-feature-pills">
              <span>
                <Users size={14} />
                Up to 32 people
              </span>
              <span>
                <Radio size={14} />
                Shared questions
              </span>
              <span>
                <Eye size={14} />
                Viewers welcome
              </span>
            </div>
          </div>
          <section className="room-entry">
            <div
              className="room-entry-tabs"
              role="tablist"
              aria-label="Join or host a room"
            >
              <button
                role="tab"
                aria-selected={tab === "join"}
                onClick={() => setTab("join")}
              >
                <KeyRound size={17} />
                Join the squad
              </button>
              <button
                role="tab"
                aria-selected={tab === "host"}
                onClick={() => setTab("host")}
              >
                <Radio size={17} />
                Host practice
              </button>
            </div>
            {available === null ? (
              <p className="room-unavailable" role="status">
                Checking the practice rooms…
              </p>
            ) : !available ? (
              <div className="room-unavailable">
                <h2>Team rooms are warming up.</h2>
                <p>You can jump into a solo round while we get these ready.</p>
                <Link
                  className="game-button primary"
                  href="/practice?mode=quick"
                >
                  Play a solo round
                  <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(
                    tab === "host" ? "create" : "join",
                    tab === "host"
                      ? {
                          name,
                          title,
                          focus,
                          count,
                          seconds,
                          correct,
                          incorrect,
                        }
                      : { name, code, watch },
                  );
                }}
              >
                <label>
                  Your player name
                  <input
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={32}
                    placeholder="What should the team call you?"
                  />
                </label>
                {tab === "join" ? (
                  <>
                    <label>
                      Room code
                      <input
                        className="room-code-input"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        value={code}
                        onChange={(e) =>
                          setCode(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-F0-9]/g, "")
                              .slice(0, 8),
                          )
                        }
                        required
                        pattern="[A-F0-9]{8}"
                        placeholder="8-CHARACTER CODE"
                        maxLength={8}
                      />
                    </label>
                    <label className="watch-choice">
                      <input
                        type="checkbox"
                        checked={watch}
                        onChange={(e) => setWatch(e.target.checked)}
                      />
                      <span>
                        <strong>Just watching?</strong>
                        <small>
                          See every question and follow the score without
                          buzzing.
                        </small>
                      </span>
                      <Eye size={20} />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Team or practice name
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={60}
                        placeholder="Your team’s Tuesday practice"
                      />
                    </label>
                    <div className="room-form-grid">
                      <label>
                        Subject focus
                        <select
                          value={focus}
                          onChange={(e) => setFocus(e.target.value)}
                        >
                          <option value="">Mixed subjects</option>
                          {subjects.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Round length
                        <select
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                        >
                          {[5, 10, 15, 20].map((n) => (
                            <option key={n} value={n}>
                              {n} questions
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Question clock
                        <select
                          value={seconds}
                          onChange={(e) => setSeconds(Number(e.target.value))}
                        >
                          {[15, 30, 45, 60].map((n) => (
                            <option key={n} value={n}>
                              {n} seconds
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Correct answer
                        <input
                          type="number"
                          min={1}
                          max={100}
                          required
                          value={correct}
                          onChange={(e) => setCorrect(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Incorrect answer
                        <input
                          type="number"
                          min={-100}
                          max={0}
                          required
                          value={incorrect}
                          onChange={(e) => setIncorrect(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <p className="host-note">
                      You’ll moderate this round. Teammates join on their own
                      phones to play or watch. Scores are configurable practice
                      rules.
                    </p>
                  </>
                )}
                <button
                  className="game-button primary"
                  disabled={
                    busy ||
                    !name.trim() ||
                    (tab === "join" && code.length !== 8)
                  }
                >
                  {busy
                    ? "Getting your room ready…"
                    : tab === "host"
                      ? "Create team room"
                      : watch
                        ? "Join as a viewer"
                        : "Let me in"}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </section>
          <p className="team-smallprint">
            Original demo questions · HCASC-inspired preparation · No official
            affiliation
          </p>
          <Link className="room-back" href="/dashboard">
            <ArrowLeft size={14} />
            Back to the lobby
          </Link>
        </>
      )}
    </div>
  );
}
