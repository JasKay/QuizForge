"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { MasteryProfile } from "@/lib/mastery";

export function PlayHome({ mastery: _mastery }: { mastery?: MasteryProfile | null }) {
  const [format, setFormat] = useState<"solo" | "team">("team");
  return (
    <section className="tr-home tr-play bz-play-clean bz-play-quiet" aria-label="Choose a game">
      <div className="tr-page-title">
        <div><p className="tr-kicker">PLAY</p><h1>Ready for a round?</h1></div>
      </div>
      <p className="bz-play-subtitle">Choose how you want to play.</p>
      <div className="bz-play-format-tabs" role="group" aria-label="Choose solo or team play">
        <button type="button" aria-pressed={format === "solo"} className={format === "solo" ? "is-active" : ""} onClick={() => setFormat("solo")}>Solo</button>
        <button type="button" aria-pressed={format === "team"} className={format === "team" ? "is-active" : ""} onClick={() => setFormat("team")}>With others</button>
      </div>
      {format === "team" ? (
        <div className="bz-quiet-options">
          <Link href="/rooms?host=1&mode=hcasc" className="bz-play-equal-option">
            <span><strong>Start a match</strong><small>Create a room, choose a format and invite friends.</small></span><ChevronRight size={18}/>
          </Link>
          <Link href="/rooms" className="bz-play-equal-option">
            <span><strong>Join a match</strong><small>Enter a room code or use an invitation.</small></span><ChevronRight size={18}/>
          </Link>
        </div>
      ) : (
        <div className="bz-quiet-options">
          <Link href="/ultimate" className="bz-play-equal-option">
            <span><strong>Ultimate Challenge</strong><small>Ten questions in sixty seconds.</small></span><ChevronRight size={18}/>
          </Link>
          <Link href="/practice" className="bz-play-equal-option">
            <span><strong>Face-Off Practice</strong><small>Practise quick recall by category.</small></span><ChevronRight size={18}/>
          </Link>
        </div>
      )}
    </section>
  );
}
