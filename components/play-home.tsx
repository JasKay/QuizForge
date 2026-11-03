"use client";
import Link from "next/link";
import { ArrowRight, Grid2X2, Timer, UsersRound, Zap, Trophy, UserPlus, Swords } from "lucide-react";
import type { MasteryProfile } from "@/lib/mastery";
import { MasteryNudge } from "./mastery-home";

export function PlayHome({ mastery }: { mastery?: MasteryProfile | null }) {
  return (
    <section className="tr-home tr-play" aria-label="Choose a game">
      <div className="tr-page-title">
        <div>
          <p className="tr-kicker">PRACTISE TOGETHER. COMPETE FOR REAL.</p>
          <h1>Let's play.</h1>
        </div>
        <span className="tr-page-symbol"><Zap size={23} /></span>
      </div>
      <p className="tr-page-intro">Buzz in with friends, challenge another team, or sharpen your skills solo.</p>

      <div className="tr-game-options">
        <Link href="/rooms?host=1&mode=hcasc" className="tr-game-card tr-game-multiplayer">
          <div className="tr-game-top">
            <span className="tr-game-number">01</span>
            <span className="tr-game-badge">START HERE · MULTIPLAYER</span>
            <UsersRound size={25} />
          </div>
          <div className="tr-game-copy">
            <h2>Play with friends</h2>
            <p>Create a room, invite players and practise live face-offs together. No school team needed.</p>
          </div>
          <span className="tr-game-bottom"><span>Create a practice room</span><ArrowRight size={20} /></span>
        </Link>
        <Link href="/rooms" className="tr-game-card tr-game-category">
          <div className="tr-game-top">
            <span className="tr-game-number">02</span>
            <span className="tr-game-badge">HAVE AN INVITE?</span>
            <UserPlus size={24} />
          </div>
          <div className="tr-game-copy">
            <h2>Join a game</h2>
            <p>Enter a friend's room code and get ready to buzz.</p>
          </div>
          <span className="tr-game-bottom"><span>Join a live room</span><ArrowRight size={20} /></span>
        </Link>
        <Link href="/rooms?host=1&mode=hcasc" className="tr-game-card tr-game-category">
          <div className="tr-game-top">
            <span className="tr-game-number">03</span>
            <span className="tr-game-badge">HCASC FORMAT</span>
            <Swords size={24} />
          </div>
          <div className="tr-game-copy">
            <h2>Full HCASC match</h2>
            <p>Three 4-minute face-off rounds, then a 60-second Ultimate Challenge for each team.</p>
          </div>
          <span className="tr-game-bottom"><span>Host a team match</span><ArrowRight size={20} /></span>
        </Link>
        <Link href="/ultimate" className="tr-game-card tr-game-ultimate">
          <div className="tr-game-top">
            <span className="tr-game-number">04</span>
            <span className="tr-game-badge">SOLO · SPEED</span>
            <Timer size={24} />
          </div>
          <div className="tr-game-copy">
            <h2>Ultimate Challenge</h2>
            <p>10 questions. 60 seconds. 50 points per correct answer.</p>
          </div>
          <span className="tr-game-bottom"><span>Up to 500 points</span><ArrowRight size={20} /></span>
        </Link>
        <Link href="/practice" className="tr-game-card tr-game-category">
          <div className="tr-game-top">
            <span className="tr-game-number">05</span>
            <span className="tr-game-badge">SOLO · YOUR PACE</span>
            <Grid2X2 size={24} />
          </div>
          <div className="tr-game-copy">
            <h2>Play by category</h2>
            <p>Pick a subject and build your confidence before the next match.</p>
          </div>
          <span className="tr-game-bottom"><span>History, science, culture & more</span><ArrowRight size={20} /></span>
        </Link>
      </div>
      <Link href="/teams" className="tr-quick-play">
        <Trophy size={16} />
        Represent your school · Team hub
        <ArrowRight size={16} />
      </Link>
      <MasteryNudge profile={mastery} play />
    </section>
  );
}
