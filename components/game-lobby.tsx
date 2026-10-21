"use client";
import Link from "next/link";

import { Zap, Users, Trophy, BookOpen } from "lucide-react";
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
        <p>Choose a game.</p>
      </div>
      <div className="home-six" aria-label="Choose a game">
        {modes.map((m) => (
          <Link key={m.name} href={m.href} className={"home-tile " + m.tone}>
            <m.icon size={25} />
            <strong>{m.name}</strong>
            <span>{m.detail}</span>
          </Link>
        ))}
      </div>
      <p className="home-progress">
        {total
          ? `${total} played · ${correct} correct`
          : `${questions.length} questions`}
      </p>
    </div>
  );
}
