"use client";
import Link from "next/link";
import { ArrowUpRight, Zap, Users, Mic, Layers } from "lucide-react";
export function GameLobby(_: {
  name?: string;
  correct?: number;
  total?: number;
}) {
  const modes = [
    {
      title: "Quick play",
      detail: "Learn at your pace",
      href: "/practice?mode=quick",
      icon: Zap,
    },
    {
      title: "Team Rooms",
      detail: "Play on your own phones",
      href: "/rooms",
      icon: Users,
    },
    {
      title: "Ultimate Challenge",
      detail: "10 questions. 60 seconds.",
      href: "/ultimate",
      icon: Mic,
    },
    {
      title: "Categories",
      detail: "Choose what to learn",
      href: "/practice",
      icon: Layers,
    },
  ];
  return (
    <section className="trivia-home">
      <div className="page-title">
        <p className="overline">PLAY</p>
        <h1>Choose your game</h1>
      </div>
      <div className="trivia-modes">
        {modes.map((m, i) => (
          <Link href={m.href} className={"trivia-mode mode-" + i} key={m.title}>
            <div className="mode-symbol">
              <m.icon size={25} strokeWidth={1.7} />
              <ArrowUpRight size={17} />
            </div>
            <div>
              <h2>{m.title}</h2>
              <p>{m.detail}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
