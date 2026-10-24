"use client";
import Link from "next/link";
import { ArrowRight, Globe2, Sparkles } from "lucide-react";
import { BuzzerLogo } from "./buzzer-shell";
export function WelcomeHome() {
  return (
    <div className="buzzer-app tr-welcome">
      <header>
        <BuzzerLogo />
        <Link href="/login">
          Sign in
          <ArrowRight size={15} />
        </Link>
      </header>
      <main>
        <p className="tr-kicker">FOR THE CURIOUS. AND THE COMPETITIVE.</p>
        <h1>
          A little more
          <br />
          in the know.
        </h1>
        <p className="tr-welcome-intro">
          Follow a trivia trail. Find your strong suit.
          <br />
          Bring something new to the game.
        </p>
        <div className="tr-welcome-art" aria-hidden="true">
          <div className="tr-welcome-backcard" />
          <div className="tr-welcome-fact">
            <span>
              <Globe2 size={16} />
              AROUND THE WORLD
            </span>
            <Globe2 className="tr-welcome-globe" size={145} strokeWidth={0.8} />
            <strong>
              One good question
              <br />
              leads to another.
            </strong>
            <div>
              <span>
                <Sparkles size={14} />A little curiosity. A lot to discover.
              </span>
              <ArrowRight size={18} />
            </div>
          </div>
          <span className="tr-welcome-sticker">
            Learn.
            <br />
            Play.
            <br />
            Repeat.
          </span>
        </div>
      </main>
      <section className="tr-welcome-actions">
        <Link href="/learn" className="tr-button tr-button-ink">
          Get started
          <ArrowRight size={18} />
        </Link>
        <p>No account needed. Save your progress whenever.</p>
        <Link className="tr-welcome-play" href="/play">
          Here for a game? Let's play
          <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
