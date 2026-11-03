"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
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
          <Link href="/rooms?host=1&mode=hcasc" className="bz-quiet-primary">
            <span><strong>Start a match</strong><small>Create a room and invite friends to play.</small></span><ArrowRight size={19}/>
          </Link>
          <Link href="/rooms" className="bz-quiet-row"><span><strong>Join a match</strong><small>Have an invite code?</small></span><ChevronRight size={18}/></Link>
          <p className="bz-quiet-note">Full match: three face-off rounds and Ultimate Challenge.</p>
        </div>
      ) : (
        <div className="bz-quiet-options">
          <Link href="/ultimate" className="bz-quiet-primary">
            <span><strong>Ultimate Challenge</strong><small>10 questions. 60 seconds.</small></span><ArrowRight size={19}/>
          </Link>
          <Link href="/practice" className="bz-quiet-row"><span><strong>Practice by category</strong><small>Build your recall at your own pace.</small></span><ChevronRight size={18}/></Link>
        </div>
      )}
    </section>
  );
}
