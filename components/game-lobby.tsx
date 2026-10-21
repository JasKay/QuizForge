"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Zap,
  Timer,
  Users,
  Sun,
  Play,
  Atom,
  Landmark,
  Globe,
  BookOpen,
  Palette,
  Calculator,
  Trophy,
  Flame,
  Star,
  X,
  Gamepad2,
} from "lucide-react";
import { playSound } from "@/lib/game";
const modes = [
  {
    name: "Quick Play",
    sub: "Just you and your big brain.",
    icon: Zap,
    tag: "THE CLASSIC",
    color: "lilac",
    href: "/practice?mode=quick",
    detail: "5 questions · No timer",
  },
  {
    name: "Beat the Clock",
    sub: "Think fast. Make it count.",
    icon: Timer,
    tag: "FEEL THE RUSH",
    color: "lime",
    href: "/practice?mode=speed",
    detail: "5 questions · 30s per question",
  },
  {
    name: "Daily Five",
    sub: "New day. New bragging rights.",
    icon: Sun,
    tag: "FRESH EVERY DAY",
    color: "peach",
    href: "/practice?mode=daily",
    detail: "5 questions · Mixed categories",
  },
];
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
    [players, setPlayers] = useState(["Player 1", "Player 2"]),
    [buzz, setBuzz] = useState(false);
  const xp = correct * 100;
  return (
    <div className="game-lobby">
      <div className="lobby-topline">
        <span>
          <span className="online-dot" /> THE BRAIN GYM IS OPEN
        </span>
        <span>
          Good to see you{name ? `, ${name.split(" ")[0]}` : ""}. Ready for a
          round? <span aria-hidden="true">✌</span>
        </span>
      </div>
      <section className="lobby-hero">
        <div className="lobby-hero-copy">
          <span className="game-eyebrow">
            <span>✦</span> LESS SCROLLING. MORE KNOWING.
          </span>
          <h1>
            Big brain.
            <br />
            <span>Bigger energy.</span>
          </h1>
          <p>
            A little trivia. A little friendly competition.
            <br />A whole lot of “wait, I actually knew that.”
          </p>
          <div className="lobby-hero-actions">
            <Link className="game-button primary" href="/practice?mode=quick">
              <Play size={19} fill="currentColor" />
              Let’s play
              <ArrowRight size={19} />
            </Link>
            <Link className="game-button secondary" href="/rooms">
              <Users size={18} />
              Play with my team
            </Link>
          </div>
          <div className="hero-caption">
            <span className="mini-avatars">
              <i>A</i>
              <i>B</i>
              <i>YOU</i>
            </span>
            <span>Solo or side by side. Bring your brain.</span>
          </div>
        </div>
        <div className="buzzer-scene">
          <span className="scene-star star-a">✦</span>
          <span className="scene-star star-b">✦</span>
          <span className="scene-star star-c">✳</span>
          <div className="scene-circle" />
          <span className="scene-label">GOT THE ANSWER?</span>
          <div className="score-ticket">
            <Star size={18} fill="currentColor" />
            <div>
              <strong>BIG BRAIN MOMENT</strong>
              <span>+100 points</span>
            </div>
          </div>
          <button
            className={`hero-buzzer ${buzz ? "pressed" : ""}`}
            aria-label="Try the buzzer"
            onClick={() => {
              playSound("buzz");
              setBuzz(true);
              setTimeout(() => setBuzz(false), 220);
            }}
          >
            <span className="buzzer-dome">
              <Zap size={62} fill="currentColor" />
            </span>
            <span className="buzzer-base" />
            <span className="buzzer-foot" />
          </button>
          <span className="buzzer-caption">
            {buzz ? "BUZZ! YOU’RE UP." : "GO ON. GIVE IT A TAP."}
          </span>
          <div className="streak-ticket">
            <Flame size={23} />
            <div>
              <strong>Your next hot streak</strong>
              <span>starts right here.</span>
            </div>
          </div>
          <span className="scene-squiggle" aria-hidden="true">
            ↝
          </span>
        </div>
      </section>
      <section className="team-room-callout">
        <span className="team-callout-icon">
          <Users size={27} />
        </span>
        <div>
          <span className="game-eyebrow">BUILT FOR YOUR NEXT COMPETITION</span>
          <h2>Your team. One room. Every phone.</h2>
          <p>
            Shared questions, real buzzers, and a moderator to keep the round
            moving.
          </p>
        </div>
        <div className="team-callout-actions">
          <Link className="game-button primary" href="/rooms?host=1">
            Host practice <ArrowRight size={16} />
          </Link>
          <Link className="team-callout-join" href="/rooms">
            Join with a code
          </Link>
        </div>
      </section>
      <section className="pick-mode">
        <div className="game-section-heading">
          <div>
            <span className="game-eyebrow">FIND YOUR KIND OF FUN</span>
            <h2>Pick your play.</h2>
          </div>
          <span>
            No studying required. Just jump in. <Gamepad2 size={18} />
          </span>
        </div>
        <div className="mode-grid">
          {modes.map((m) => (
            <Link href={m.href} className={`mode-card ${m.color}`} key={m.name}>
              <div className="mode-card-top">
                <span className="mode-icon">
                  <m.icon size={27} />
                </span>
                <span className="mode-tag">{m.tag}</span>
              </div>
              <h3>{m.name}</h3>
              <p>{m.sub}</p>
              <div className="mode-card-bottom">
                <span>{m.detail}</span>
                <span className="mode-arrow">
                  <ArrowRight size={20} />
                </span>
              </div>
            </Link>
          ))}
          <button
            className="mode-card pink"
            onClick={() => dialog.current?.showModal()}
          >
            <div className="mode-card-top">
              <span className="mode-icon">
                <Users size={27} />
              </span>
              <span className="mode-tag">BETTER TOGETHER</span>
            </div>
            <h3>Pass & Play</h3>
            <p>One screen. Two competitive people.</p>
            <div className="mode-card-bottom">
              <span>2 players · Take turns</span>
              <span className="mode-arrow">
                <ArrowRight size={20} />
              </span>
            </div>
          </button>
        </div>
      </section>
      <div className="lobby-bottom">
        <section className="category-strip">
          <div className="game-section-heading">
            <h2>Got a thing for…</h2>
            <Link href="/practice">
              All categories <ArrowRight size={15} />
            </Link>
          </div>
          <div className="category-pills">
            {[
              ["Science", Atom],
              ["History", Landmark],
              ["Geography", Globe],
              ["Literature", BookOpen],
              ["Arts", Palette],
              ["Mathematics", Calculator],
            ].map(([s, Icon]) => {
              const I = Icon as typeof Zap;
              return (
                <Link
                  key={String(s)}
                  href={`/practice?mode=category&subject=${encodeURIComponent(String(s))}`}
                >
                  <I size={17} />
                  {String(s)}
                </Link>
              );
            })}
          </div>
          <p>Original demo questions. HCASC-inspired. All curiosity welcome.</p>
        </section>
        <section className="level-card">
          <span className="level-medal">
            <Trophy size={27} />
          </span>
          <div>
            <div className="level-card-title">
              <strong>
                Level {Math.floor(xp / 500) + 1} ·{" "}
                {xp >= 1000
                  ? "Brainiac"
                  : xp >= 500
                    ? "Quick Thinker"
                    : "Curious Mind"}
              </strong>
              <span>{xp % 500} / 500 XP</span>
            </div>
            <div className="level-track">
              <span style={{ width: `${(xp % 500) / 5}%` }} />
            </div>
            <p>
              {total
                ? `${total} played · ${correct} nailed. Look at you go.`
                : "Your first big brain moment is one round away."}
            </p>
          </div>
        </section>
      </div>
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
        <span className="mode-icon">
          <Users size={30} />
        </span>
        <span className="game-eyebrow">THE FRIENDLY RIVALRY STARTS HERE</span>
        <h2 id="party-title">Who’s playing?</h2>
        <p>
          Share one screen and take turns answering. Highest score gets the
          bragging rights.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = `/practice?mode=party&p1=${encodeURIComponent(players[0].trim())}&p2=${encodeURIComponent(players[1].trim())}`;
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
        <small>Local game · 8 questions · No account needed in demo mode</small>
      </dialog>
    </div>
  );
}
