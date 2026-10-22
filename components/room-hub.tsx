"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { RoomState } from "@/lib/room-types";
import { RoomArena } from "./room-arena";
export function RoomHub() {
  const router = useRouter(),
    [available, setAvailable] = useState<boolean | null>(null),
    [room, setRoom] = useState<RoomState | null>(null),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [watch, setWatch] = useState(false),
    [tab, setTab] = useState<"join" | "host">("join"),
    [mode, setMode] = useState<"classic" | "hcasc">("classic"),
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
  function inviteCode(value: string) {
    try {
      return new URL(value).searchParams.get("code")?.toUpperCase() || "";
    } catch {
      return value.trim().toUpperCase();
    }
  }
  const parsed = inviteCode(code),
    valid = /^[A-F0-9]{8}$/.test(parsed);
  return (
    <div className="room-hub compact-rooms">
      {error && (
        <p className="compact-error" role="alert">
          {error}
        </p>
      )}
      {room ? (
        <RoomArena room={room} send={send} busy={busy} connected={connected} />
      ) : (
        <section className="room-entry-screen">
          <div className="page-title">
            <p className="overline">MULTIPLAYER</p>
            <h1>Team Rooms</h1>
          </div>
          <div className="room-tabs" role="tablist" aria-label="Join or create">
            <button
              role="tab"
              aria-selected={tab === "join"}
              onClick={() => {
                setTab("join");
                setError("");
              }}
            >
              Join room
            </button>
            <button
              role="tab"
              aria-selected={tab === "host"}
              onClick={() => {
                setTab("host");
                setError("");
              }}
            >
              Create room
            </button>
          </div>
          <form
            className="room-compact-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(
                tab === "host" ? "create" : "join",
                tab === "host"
                  ? {
                      name: name.trim() || "Host",
                      title: "Team room",
                      count: 5,
                      seconds: 30,
                      mode,
                    }
                  : {
                      name:
                        name.trim() ||
                        "Guest " +
                          Math.random().toString(36).slice(2, 5).toUpperCase(),
                      code: parsed,
                      watch,
                    },
              );
            }}
          >
            {tab === "join" && (
              <label>
                Room link or code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste an invite link"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={512}
                  autoComplete="off"
                  required
                />
              </label>
            )}
            <label>
              Your name <span className="optional">optional</span>
              <input
                aria-label="Your player name"
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                placeholder="Name shown in the room"
              />
            </label>
            {tab === "join" && (
              <label className="compact-watch">
                <input
                  type="checkbox"
                  checked={watch}
                  onChange={(e) => setWatch(e.target.checked)}
                />
                Watch instead of playing
              </label>
            )}
            {tab === "host" && (
              <>
                <label>
                  Game format
                  <select
                    value={mode}
                    onChange={(e) =>
                      setMode(
                        e.target.value === "hcasc" ? "hcasc" : "classic",
                      )
                    }
                  >
                    <option value="classic">Team practice</option>
                    <option value="hcasc">HCASC-style tournament</option>
                  </select>
                </label>
                <p className="room-create-hint">
                  {mode === "hcasc"
                    ? "Three four-minute rounds. Four categories per board; teams take turns choosing questions."
                    : "Create a room, share the link, then play together."}
                </p>
              </>
            )}
            <button
              className="trivia-primary"
              disabled={
                busy || available !== true || (tab === "join" && !valid)
              }
            >
              {busy
                ? "Connecting…"
                : tab === "host"
                  ? "Create room"
                  : "Join room"}
              <ArrowRight size={18} />
            </button>
          </form>
          {available === false && (
            <p role="status">Rooms are unavailable. Try again shortly.</p>
          )}
        </section>
      )}
    </div>
  );
}
