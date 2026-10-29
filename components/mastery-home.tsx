"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  Target,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type { MasteryProfile } from "@/lib/mastery";
const subjectUrl = (path: string, subject: string) =>
  `${path}${path.includes("?") ? "&" : "?"}subject=${encodeURIComponent(subject)}`;
export function MasteryNudge({
  profile,
  play = false,
}: {
  profile?: MasteryProfile | null;
  play?: boolean;
}) {
  if (!profile?.attempts) return null;
  const focus = profile.domains.find((d) => d.subject === profile.focus);
  if (!focus) return null;
  return (
    <Link
      className="ms-nudge"
      href={subjectUrl(
        play ? "/practice?mode=category" : "/learn",
        focus.subject,
      )}
    >
      <Target size={20} />
      <span>
        <strong>
          {play
            ? `Put ${focus.subject} to the test`
            : `Build your ${focus.subject} power`}
        </strong>
        <small>
          {focus.due
            ? `${focus.due} connections need another look`
            : "Your next area to grow"}{" "}
          · Level {focus.level}
        </small>
      </span>
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function MasteryHome({
  profile,
  signedIn,
}: {
  profile: MasteryProfile | null;
  signedIn: boolean;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [sort, setSort] = useState("power");
  if (!profile)
    return (
      <section className="tr-home" role="status">
        <h1>Your Mastery</h1>
        <p>Connecting your progress…</p>
      </section>
    );
  const domains = [...profile.domains].sort((a, b) =>
    sort === "focus"
      ? b.due - a.due || a.power - b.power
      : b.power - a.power || b.xp - a.xp,
  );
  const selected =
    profile.domains.find((d) => d.subject === chosen) || domains[0];
  return (
    <section className="tr-home ms-home" aria-label="Your category mastery">
      <div className="tr-page-title">
        <div>
          <p className="tr-kicker">EVERY ANSWER BUILDS SOMETHING</p>
          <h1>Your power.</h1>
        </div>
        <span className="tr-page-symbol">
          <TrendingUp size={26} />
        </span>
      </div>
      <p className="ms-intro">Learn it. Recall it. Bring it to the game.</p>
      <div className="ms-summary">
        <div>
          <Sparkles size={18} />
          <strong>{profile.xp.toLocaleString()}</strong>
          <span>earned XP</span>
        </div>
        <div>
          <strong>{profile.attempts}</strong>
          <span>answers connected</span>
        </div>
      </div>
      {!signedIn && (
        <p className="ms-save">
          Progress on this device.{" "}
          <Link href="/signup">
            Create an account to keep it across devices.
          </Link>
        </p>
      )}
      {!profile.attempts ? (
        <div className="ms-empty">
          <Target size={32} />
          <h2>Your first answer starts the story.</h2>
          <p>
            Discover your strengths across every category. Learning, solo games
            and team answers all feed the same profile.
          </p>
          <Link href="/learn" className="tr-button tr-button-ink">
            Find your first topic <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="ms-insights">
          <p>
            <span>STRONGEST SO FAR</span>
            <strong>{profile.strongest}</strong>
          </p>
          <p>
            <span>ROOM TO GROW</span>
            <strong>{profile.focus}</strong>
          </p>
        </div>
      )}
      <div className="ms-section-title">
        <h2>Your domains</h2>
        <label>
          <span className="sr-only">Sort categories</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="power">Strongest first</option>
            <option value="focus">Needs practice</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
      <div className="ms-domain-grid">
        {domains.map((d) => (
          <button
            key={d.subject}
            className={`ms-domain ${selected?.subject === d.subject ? "is-selected" : ""}`}
            onClick={() => {
              setChosen(d.subject);
              requestAnimationFrame(() =>
                document
                  .querySelector(".ms-detail")
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
              );
            }}
            aria-pressed={selected?.subject === d.subject}
          >
            <span className="ms-domain-title">
              <strong>{d.subject}</strong>
              <span>LV {d.level}</span>
            </span>
            <span className="ms-power">
              <b>{d.power}</b>
              <small>POWER</small>
              <em className={d.change < 0 ? "ms-loss" : ""}>
                {d.change > 0 ? "+" : ""}
                {d.change} this week
              </em>
            </span>
            <progress
              max={100}
              value={d.power}
              aria-label={`${d.subject} power`}
            />
            <span className="ms-domain-bottom">
              {d.explored
                ? `${d.explored} explored · ${d.accuracy}% accuracy`
                : "Ready to discover"}
              <ArrowUpRight size={15} />
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <article
          className="ms-detail"
          aria-label={`${selected.subject} details`}
        >
          <p className="tr-kicker">YOUR NEXT MOVE</p>
          <h2>{selected.subject}</h2>
          <p>
            Level {selected.level} · {selected.xp} XP · {selected.due} to
            revisit
          </p>
          <svg
            className="ms-trend"
            viewBox="0 0 300 70"
            role="img"
            aria-label={`${selected.subject} power over the last seven days: ${selected.history.join(", ")}`}
          >
            <path
              d="M0 65H300 M0 35H300 M0 5H300"
              stroke="currentColor"
              opacity=".1"
            />
            <polyline
              points={selected.history
                .map((v, i) => `${(i * 300) / 7},${65 - v * 0.6}`)
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle
              cx="300"
              cy={65 - selected.power * 0.6}
              r="4"
              fill="currentColor"
            />
          </svg>
          <div className="ms-chart-labels">
            <span>7 days ago</span>
            <span>Today · {selected.power} power</span>
          </div>
          <p className="ms-detail-note">
            {selected.attempts
              ? `${selected.attempts} answers across ${selected.sources.filter((s) => s !== "legacy").join(", ") || "earlier practice"}.`
              : "No evidence yet. Try a trail, then test what stays with you."}{" "}
            {selected.due > 0
              ? "Refresh missed and older answers to rebuild your recall."
              : "Harder questions and fresh recall build more power."}
          </p>
          <div className="ms-detail-actions">
            <Link href={subjectUrl("/learn", selected.subject)}>
              Learn this domain <ArrowRight size={16} />
            </Link>
            <Link
              href={subjectUrl("/practice?mode=category", selected.subject)}
            >
              Test in Play <ArrowUpRight size={16} />
            </Link>
          </div>
        </article>
      )}
      <details className="ms-explainer">
        <summary>How your power grows</summary>
        <p>
          Easy, medium and hard answers earn 10, 20 and 40 XP. A question earns
          XP once per day; levels keep your earned XP. Power measures current
          recall: difficult questions contribute more, misses reduce it, and
          evidence fades after seven days without practice. Review restores it.
          Same-day repeats have a small effect. Studied answers count less than
          unaided recall.
        </p>
        <p>
          Power approaches a ceiling of 99. There is always another connection
          to make. This is a practice estimate, not an official HCASC rating.
          Older progress starts from your last recorded answer.
        </p>
      </details>
    </section>
  );
}
