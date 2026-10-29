"use client";
import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Globe2,
  Landmark,
  Music2,
  Atom,
  BookOpen,
  Sparkles,
  RotateCcw,
  Grid2X2,
  X,
} from "lucide-react";
import { ViewportPages } from "./viewport-pages";
import type { MasteryProfile } from "@/lib/mastery";
import { MasteryNudge } from "./mastery-home";
import { SwipeTrailCard } from "./swipe-trail-card";
export type Trail = {
  id: string;
  title: string;
  intro?: string;
  subject: string;
  learned: number;
  seen?: number;
  total: number;
  related?: string[];
};
const icons: Record<string, typeof Globe2> = {
  Geography: Globe2,
  Science: Atom,
  History: Landmark,
  Arts: Landmark,
  Literature: BookOpen,
  Music: Music2,
};
export function LearnJourney({
  catalog,
  mastery,
  due,
  xp,
  busy,
  onStart,
  onReview,
}: {
  catalog: Trail[];
  mastery?: MasteryProfile | null;
  due: number;
  xp: number;
  busy: boolean;
  onStart: (id: string) => void;
  onReview: () => void;
}) {
  const [selected, setSelected] = useState(0),
    [browse, setBrowse] = useState(false);
  const trail = catalog[selected] || catalog[0];
  useEffect(() => {
    try {
      const focus = new URLSearchParams(window.location.search).get("subject");
      const id =
        catalog.find((t) => t.subject === focus)?.id ||
        localStorage.getItem("buzzer-active-trail");
      const index = catalog.findIndex((t) => t.id === id);
      if (index >= 0) setSelected(index);
    } catch {}
  }, [catalog]);
  function choose(index: number) {
    const keepCardFocus = document.activeElement?.closest(".tr-swipe-card");
    setSelected(index);
    try {
      localStorage.setItem("buzzer-active-trail", catalog[index].id);
    } catch {}
    if (keepCardFocus)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(".tr-swipe-card")
          ?.focus({ preventScroll: true }),
      );
  }
  if (!trail)
    return (
      <section className="tr-home">
        <p className="tr-kicker">FINDING YOUR NEXT TRAIL...</p>
      </section>
    );
  const Icon = icons[trail.subject] || Compass;
  const level = Math.floor(xp / 100) + 1;
  const related = (trail.related || [])
    .map((id) => catalog.find((t) => t.id === id))
    .filter((t): t is Trail => !!t)
    .slice(0, 2);
  const total = catalog
    .filter((t) => t.id.startsWith("trail-"))
    .reduce((n, t) => n + t.total, 0);
  return (
    <section
      className={`tr-home tr-learn ${mastery?.attempts ? "ms-connected-learn" : ""}`}
      aria-label="Your trivia trails"
    >
      <div className="tr-page-title">
        <div>
          <p className="tr-kicker">A WORLD OF THINGS TO KNOW</p>
          <h1>Stay curious.</h1>
        </div>
        <span className="tr-level">
          <Sparkles size={15} />
          <b>{level}</b>
          <span>LEVEL</span>
        </span>
      </div>
      <div className="tr-xp-strip">
        <span>{xp.toLocaleString()} XP</span>
        <progress
          value={xp % 100}
          max={100}
          aria-label="Progress to next level"
        />
        <span>
          {100 - (xp % 100)} to level {level + 1}
        </span>
      </div>
      <MasteryNudge profile={mastery} />
      <div className="tr-section-heading">
        <h2>Your next rabbit hole</h2>
        <button onClick={() => setBrowse(true)}>
          All topics
          <Grid2X2 size={14} />
        </button>
      </div>
      <SwipeTrailCard
        key={trail.id}
        busy={busy}
        label={trail.title}
        onPass={() => choose((selected + 1) % catalog.length)}
        onAccept={() => onStart(trail.id)}
      >
        <div className="tr-hero-top">
          <span className="tr-topic-pill">{trail.subject}</span>
          <span>
            {trail.total - (trail.seen || 0) > 0
              ? `${trail.total - (trail.seen || 0)} to discover`
              : "Ready to revisit"}
          </span>
        </div>
        <div className="tr-trail-graphic" aria-hidden="true">
          <i />
          <i />
          <Icon size={108} strokeWidth={0.9} />
          <span className="tr-orbit-spark">
            <Sparkles size={17} />
          </span>
        </div>
        <div className="tr-hero-copy">
          <h2>{trail.title}</h2>
          <p>
            {trail.intro ||
              "Follow the clues. Find something you did not know."}
          </p>
        </div>
        <button
          className="tr-button tr-button-lime"
          disabled={busy}
          onClick={() => onStart(trail.id)}
        >
          {busy
            ? "Opening your trail..."
            : (trail.seen || 0) > 0
              ? "Continue this trail"
              : "Follow this trail"}
          <ArrowRight size={19} />
        </button>
        <div className="tr-hero-bottom">
          <span>Swipe left to skip / right to explore</span>
          <div>
            <button
              onClick={() => choose((selected + 1) % catalog.length)}
              aria-label="Next topic"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onStart(trail.id)}
              aria-label="Start this trail"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </SwipeTrailCard>
      <div className="tr-related-home">
        <div className="tr-section-heading">
          <h2>Connect the dots</h2>
          <span>{total.toLocaleString()} questions</span>
        </div>
        <div className="tr-related-grid">
          {related.map((t) => {
            const RelatedIcon = icons[t.subject] || Compass;
            return (
              <button key={t.id} onClick={() => onStart(t.id)}>
                <RelatedIcon size={20} />
                <span>
                  <small>{t.subject}</small>
                  <strong>{t.title}</strong>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </div>
      <button className="tr-review-strip" onClick={onReview}>
        <span className="tr-review-icon">
          <RotateCcw size={18} />
        </span>
        <span>
          <strong>Bring it back</strong>
          <small>
            {due
              ? `${due} connections ready to revisit`
              : "Revisit the things you have discovered"}
          </small>
        </span>
        <ChevronRight size={17} />
      </button>
      {browse && (
        <TopicBrowser
          catalog={catalog}
          onClose={() => setBrowse(false)}
          onChoose={(id) => {
            choose(catalog.findIndex((t) => t.id === id));
            setBrowse(false);
          }}
        />
      )}
    </section>
  );
}
function TopicBrowser({
  catalog,
  onClose,
  onChoose,
}: {
  catalog: Trail[];
  onClose: () => void;
  onChoose: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      className="tr-topic-browser"
      aria-labelledby="tr-topics-title"
    >
      <div className="tr-browser-heading">
        <div>
          <p className="tr-kicker">FOLLOW YOUR CURIOSITY</p>
          <h2 id="tr-topics-title">Pick a rabbit hole.</h2>
        </div>
        <button onClick={onClose} aria-label="Close topics">
          <X size={22} />
        </button>
      </div>
      <ViewportPages label="Topics">
        {catalog.map((t) => {
          const Icon = icons[t.subject] || Compass;
          return (
            <button
              key={t.id}
              className="tr-topic-row"
              onClick={() => onChoose(t.id)}
            >
              <span className="tr-topic-icon">
                <Icon size={20} />
              </span>
              <span>
                <strong>{t.title}</strong>
                <small>
                  {t.subject} / {t.total} questions
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
          );
        })}
      </ViewportPages>
    </dialog>
  );
}
