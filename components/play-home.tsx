"use client";
import Link from "next/link";
import { ArrowRight, Grid2X2, Timer, UsersRound, Zap } from "lucide-react";
export function PlayHome() {
  return (
    <section className="tr-home tr-play" aria-label="Choose a game">
      <div className="tr-page-title">
        <div>
          <p className="tr-kicker">KNOW IT. NOW SHOW IT.</p>
          <h1>Let's play.</h1>
        </div>
        <span className="tr-page-symbol">
          <Zap size={23} />
        </span>
      </div>
      <p className="tr-page-intro">A quick challenge or a proper showdown?</p>
      <div className="tr-game-options">
        <Link href="/ultimate" className="tr-game-card tr-game-ultimate">
          <div className="tr-game-top">
            <span className="tr-game-number">01</span>
            <span className="tr-game-badge">SOLO / SPEED</span>
            <Timer size={24} />
          </div>
          <div className="tr-game-copy">
            <h2>Ultimate Challenge</h2>
            <p>One theme. 10 questions. 60 seconds.</p>
          </div>
          <span className="tr-game-bottom">
            <span>50 points for every correct answer</span>
            <ArrowRight size={20} />
          </span>
        </Link>
        <Link href="/practice" className="tr-game-card tr-game-category">
          <div className="tr-game-top">
            <span className="tr-game-number">02</span>
            <span className="tr-game-badge">SOLO / YOUR PACE</span>
            <Grid2X2 size={24} />
          </div>
          <div className="tr-game-copy">
            <h2>Play by category</h2>
            <p>Pick your subject. Find your strong suit.</p>
          </div>
          <span className="tr-game-bottom">
            <span>History, science, culture & more</span>
            <ArrowRight size={20} />
          </span>
        </Link>
        <Link
          href="/rooms?host=1&mode=hcasc"
          className="tr-game-card tr-game-multiplayer"
        >
          <div className="tr-game-top">
            <span className="tr-game-number">03</span>
            <span className="tr-game-badge">MULTIPLAYER / HCASC</span>
            <UsersRound size={25} />
          </div>
          <div className="tr-game-copy">
            <h2>Multiplayer HCASC</h2>
            <p>Two teams. Real buzzers. HCASC-style rounds.</p>
          </div>
          <span className="tr-game-bottom">
            <span>Host a game or join your friends</span>
            <ArrowRight size={20} />
          </span>
        </Link>
      </div>
      <Link href="/practice?mode=quick" className="tr-quick-play">
        <Zap size={16} />
        Just give me five questions
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}
