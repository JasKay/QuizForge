"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Zap,
  Users,
  Sun,
  Trophy,
  BookOpen,
  Gamepad2,
  X,
  ArrowRight,
} from "lucide-react";
import { questions, subjects } from "@/lib/questions";
export function GameLobby({
  name,
  correct = 0,
  total = 0,
}: {
  name?: string;
  correct?: number;
  total?: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [players, setPlayers] = useState(["Player 1", "Player 2"]);
  const modes = [
    {
      name: "Quick Play",
      detail: "Five questions",
      href: "/practice?mode=quick",
      icon: Zap,
      tone: "purple",
    },
    {
      name: "Team rooms",
      detail: "Host or join",
      href: "/rooms",
      icon: Users,
      tone: "green",
    },
    {
      name: "Daily Five",
      detail: "Today's challenge",
      href: "/practice?mode=daily",
      icon: Sun,
      tone: "peach",
    },
    {
      name: "Ultimate Challenge",
      detail: "10 questions · 60s",
      href: "/ultimate",
      icon: Trophy,
      tone: "blue",
    },
    {
      name: "Categories",
      detail: subjects.length + " subjects",
      href: "/practice",
      icon: BookOpen,
      tone: "yellow",
    },
  ];
  return (
    <div className="quick-home">
      <div className="quick-home-heading">
        <h1>Let's play{name ? ", " + name.split(" ")[0] : ""}.</h1>
        <p>Pick your next challenge.</p>
      </div>
      <div className="home-six" aria-label="Choose a game">
        {modes.map((m) => (
          <Link key={m.name} href={m.href} className={"home-tile " + m.tone}>
            <m.icon size={25} />
            <strong>{m.name}</strong>
            <span>{m.detail}</span>
          </Link>
        ))}
        <button
          className="home-tile pink"
          onClick={() => dialog.current?.showModal()}
        >
          <Gamepad2 size={25} />
          <strong>Pass &amp; Play</strong>
          <span>Two players, one phone</span>
        </button>
      </div>
      <p className="home-progress">
        {total
          ? `${total} played · ${correct} nailed. Look at you go.`
          : `${questions.length} questions. One game away.`}
      </p>
      <dialog
        ref={dialog}
        className="party-dialog"
        aria-labelledby="party-title"
      >
        <button
          className="dialog-close"
          aria-label="Close player setup"
          onClick={() => dialog.current?.close()}
        >
          <X size={22} />
        </button>
        <h2 id="party-title">Who's playing?</h2>
        <p>Take turns on one screen.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href =
              "/practice?mode=party&p1=" +
              encodeURIComponent(players[0].trim()) +
              "&p2=" +
              encodeURIComponent(players[1].trim());
          }}
        >
          {players.map((p, i) => (
            <label key={i}>
              Player {i + 1}
              <input
                value={p}
                maxLength={20}
                required
                onChange={(e) =>
                  setPlayers((old) =>
                    old.map((v, j) => (i === j ? e.target.value : v)),
                  )
                }
              />
            </label>
          ))}
          <button
            className="game-button primary"
            disabled={players.some((p) => !p.trim())}
          >
            Start the showdown <ArrowRight size={18} />
          </button>
        </form>
      </dialog>
    </div>
  );
}
