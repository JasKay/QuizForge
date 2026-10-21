"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Zap,
  Gamepad2,
  BarChart3,
  RotateCcw,
  Volume2,
  VolumeX,
  UserRound,
  Users,
} from "lucide-react";
import { configured } from "@/lib/supabase";
export function GameHeader({ name, xp = 0 }: { name?: string; xp?: number }) {
  const path = usePathname(),
    [sound, setSound] = useState(false);
  useEffect(() => setSound(localStorage.getItem("qf-sound") === "true"), []);
  return (
    <header className="game-header">
      <Link href="/" className="game-brand">
        <span>
          <Zap size={24} fill="currentColor" />
        </span>
        quizforge<span className="brand-star">✳</span>
      </Link>
      <nav aria-label="Main navigation">
        {[
          ["/dashboard", "The lobby", Gamepad2],
          ["/rooms", "Team rooms", Users],
          ["/progress", "My stats", BarChart3],
          ["/review", "Second chance", RotateCcw],
        ].map(([href, label, Icon]) => {
          const I = Icon as typeof Zap;
          return (
            <Link
              key={String(href)}
              href={String(href)}
              className={
                path === href || (path === "/" && href === "/dashboard")
                  ? "selected"
                  : ""
              }
              aria-current={path === href ? "page" : undefined}
            >
              <I size={17} />
              <span>{String(label)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="game-header-right">
        <button
          className="sound-toggle"
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          aria-pressed={sound}
          onClick={() => {
            localStorage.setItem("qf-sound", String(!sound));
            setSound(!sound);
          }}
        >
          {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
        <Link
          href={configured && !name ? "/login" : "/settings"}
          className="player-chip"
        >
          <span className="player-avatar">
            <UserRound size={19} />
          </span>
          <span>
            <strong>{name || "Guest player"}</strong>
            <small>
              {configured ? "LEVEL" : "GUEST · LVL"} {Math.floor(xp / 500) + 1}
            </small>
          </span>
        </Link>
      </div>
    </header>
  );
}
