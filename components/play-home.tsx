"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, ChevronRight, Grid2X2, Timer, UsersRound, Zap, Trophy, UserPlus, Swords } from "lucide-react";
import type { MasteryProfile } from "@/lib/mastery";

export function PlayHome({ mastery: _mastery }: { mastery?: MasteryProfile | null }) {
  const [format, setFormat] = useState<"solo" | "team">("team");
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

      <div className="bz-play-format-tabs" role="group" aria-label="Choose solo or team play">
        <button type="button" aria-pressed={format === "solo"} className={format === "solo" ? "is-active" : ""} onClick={() => setFormat("solo")}><Zap size={17}/> Solo</button>
        <button type="button" aria-pressed={format === "team"} className={format === "team" ? "is-active" : ""} onClick={() => setFormat("team")}><UsersRound size={17}/> Team</button>
      </div>
      {format === "solo" ? (
        <>
          <div className="bz-play-section-head"><span>CHOOSE YOUR SOLO GAME</span></div>
          <div className="bz-play-choices bz-play-choices-two">
            <Link href="/ultimate" className="bz-play-choice"><span className="bz-play-choice-icon"><Timer size={20}/></span><strong>Ultimate Challenge</strong><small>10 questions · 60 seconds · 50 points each</small><ArrowRight size={16} className="bz-play-choice-arrow"/></Link>
            <Link href="/practice" className="bz-play-choice"><span className="bz-play-choice-icon"><Swords size={20}/></span><strong>Face-off practice</strong><small>Build your recall by category. Timed solo face-off is coming next.</small><ArrowRight size={16} className="bz-play-choice-arrow"/></Link>
          </div>
        </>
      ) : (
        <>
          <div className="bz-play-section-head"><span>PLAY WITH OTHERS</span></div>
          <Link href="/rooms?host=1&mode=hcasc" className="bz-play-feature">
            <span className="bz-play-feature-icon"><UsersRound size={25}/></span>
            <span className="bz-play-feature-copy"><span className="bz-play-feature-tag">LIVE · SHARE AN INVITE LINK</span><strong>Challenge a friend</strong><span>Create a room, invite your opponent and play together.</span></span>
            <span className="bz-play-feature-arrow"><ArrowRight size={20}/></span>
          </Link>
          <Link href="/rooms" className="bz-play-join"><span className="bz-play-row-icon"><UserPlus size={19}/></span><span><strong>Join a game</strong><small>Enter an invite code or link</small></span><ChevronRight size={19}/></Link>
          <div className="bz-play-section-head bz-play-section-space"><span>TEAM GAME FORMATS</span></div>
          <div className="bz-play-choices bz-play-choices-two">
            <Link href="/rooms?host=1&mode=hcasc" className="bz-play-choice"><span className="bz-play-choice-icon"><Trophy size={20}/></span><strong>Full HCASC match</strong><small>3 × 4-minute face-offs, then Ultimate for each team</small><ArrowRight size={16} className="bz-play-choice-arrow"/></Link>
            <div className="bz-play-choice bz-play-choice-upcoming"><span className="bz-play-choice-icon"><Swords size={20}/></span><strong>Individual rounds</strong><small>Face-off only or Ultimate only · being built</small></div>
          </div>
        </>
      )}
      <div className="bz-play-footer-links">
        <Link href="/teams"><Trophy size={17} /> My school team <ChevronRight size={16}/></Link>
        <Link href="/learn"><BookOpen size={17} /> Keep learning <ChevronRight size={16}/></Link>
      </div>
    </section>
  );
}
