"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Grid2X2, Timer, UsersRound, Zap, Trophy, UserPlus, Swords } from "lucide-react";
import type { MasteryProfile } from "@/lib/mastery";

export function PlayHome({ mastery: _mastery }: { mastery?: MasteryProfile | null }) {
  return (
    <section className="tr-home tr-play bz-play-clean" aria-label="Choose a game">
      <div className="tr-page-title">
        <div>
          <p className="tr-kicker">THE ARENA</p>
          <h1>Let's play.</h1>
        </div>
        <span className="tr-page-symbol"><Zap size={22} /></span>
      </div>
      <p className="bz-play-subtitle">A little practice goes a long way. Bring your friends.</p>

      <div className="bz-play-section-head"><span>PLAY TOGETHER</span><span>01 / 02</span></div>
      <Link href="/rooms?host=1&mode=hcasc" className="bz-play-feature">
        <span className="bz-play-feature-icon"><UsersRound size={25} /></span>
        <span className="bz-play-feature-copy">
          <span className="bz-play-feature-tag">MULTIPLAYER · LIVE</span>
          <strong>Play with friends</strong>
          <span>Host a room, share a link and buzz in together.</span>
        </span>
        <span className="bz-play-feature-arrow"><ArrowRight size={20} /></span>
      </Link>
      <Link href="/rooms" className="bz-play-join">
        <span className="bz-play-row-icon"><UserPlus size={19} /></span>
        <span><strong>Join a game</strong><small>Have a room code?</small></span>
        <ChevronRight size={19} />
      </Link>

      <div className="bz-play-section-head bz-play-section-space"><span>CHOOSE YOUR CHALLENGE</span></div>
      <div className="bz-play-choices">
        <Link href="/rooms?host=1&mode=hcasc" className="bz-play-choice">
          <span className="bz-play-choice-icon"><Swords size={20} /></span>
          <strong>HCASC match</strong>
          <small>3 face-off rounds · 4 min each, plus Ultimate</small>
          <ArrowRight size={16} className="bz-play-choice-arrow" />
        </Link>
        <Link href="/ultimate" className="bz-play-choice">
          <span className="bz-play-choice-icon"><Timer size={20} /></span>
          <strong>Ultimate</strong>
          <small>10 questions · 60 seconds · 500 points</small>
          <ArrowRight size={16} className="bz-play-choice-arrow" />
        </Link>
        <Link href="/practice" className="bz-play-choice">
          <span className="bz-play-choice-icon"><Grid2X2 size={20} /></span>
          <strong>Solo practice</strong>
          <small>Explore subjects at your own pace</small>
          <ArrowRight size={16} className="bz-play-choice-arrow" />
        </Link>
      </div>
      <div className="bz-play-footer-links">
        <Link href="/teams"><Trophy size={17} /> My school team <ChevronRight size={16}/></Link>
        <Link href="/learn"><BookOpen size={17} /> Keep learning <ChevronRight size={16}/></Link>
      </div>
    </section>
  );
}
