"use client";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
type Course = {
  id: string;
  title: string;
  subject: string;
  learned: number;
  total: number;
};
export function LearnJourney({
  catalog,
  due,
  xp,
  busy,
  onStart,
  onReview,
}: {
  catalog: Course[];
  due: number;
  xp: number;
  busy: boolean;
  onStart: (id: string) => void;
  onReview: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const course = catalog[selected] || catalog[0];
  if (!course) return null;
  const step = course.learned === 0 ? 0 : course.learned < course.total ? 1 : 2;
  const level = Math.floor(xp / 100) + 1;
  return (
    <section className="bz-learn-journey" aria-label="Your learning journey">
      <div className="bz-learn-title">
        <div>
          <p className="bz-eyebrow">ONE SMALL STEP AT A TIME</p>
          <h1>
            A little wiser.
            <br />
            <em>Every day.</em>
          </h1>
        </div>
        <span className="bz-curiosity-mark" aria-hidden="true">
          <Sparkles size={27} />
        </span>
      </div>
      <div className="bz-learning-xp">
        <span>
          <Sparkles size={15} />
          {xp} XP
        </span>
        <progress
          value={xp % 100}
          max={100}
          aria-label="Progress to next level"
        />
        <span>Level {level}</span>
      </div>
      <div className="bz-course-picker">
        <button
          aria-label="Previous topic"
          onClick={() =>
            setSelected((selected + catalog.length - 1) % catalog.length)
          }
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <span>
            {course.subject} · {selected + 1} of {catalog.length}
          </span>
          <h2>{course.title}</h2>
        </div>
        <button
          aria-label="Next topic"
          onClick={() => setSelected((selected + 1) % catalog.length)}
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <div className="bz-path-meta">
        <span>GUIDED LESSON · ABOUT 3 MIN</span>
        <span>
          {course.learned}/{course.total} understood
        </span>
      </div>
      <ol className="bz-learning-path">
        {[
          {
            title: "Understand the idea",
            detail: "A clear explanation and example",
            Icon: BookOpen,
          },
          {
            title: "Put it into practice",
            detail: "Solve it with useful feedback",
            Icon: Link2,
          },
          {
            title: "Show what you know",
            detail: "Apply it. Earn your XP.",
            Icon: Target,
          },
        ].map(({ title, detail, Icon }, index) => (
          <li
            key={title}
            className={`${index === step ? "bz-path-current" : ""} ${index < step ? "bz-path-explored" : ""}`}
          >
            <span className="bz-path-node">
              {index < step ? <Check size={23} /> : <Icon size={24} />}
            </span>
            <span className="bz-path-copy">
              <strong>{title}</strong>
              <small>{detail}</small>
              {index === step && <i>Your next step</i>}
            </span>
          </li>
        ))}
      </ol>
      <div className="bz-journey-footer">
        <button
          className="bz-primary"
          disabled={busy}
          onClick={() => onStart(course.id)}
        >
          {busy
            ? "Getting your lesson…"
            : course.learned
              ? "Continue lesson"
              : "Start learning"}
          <ArrowRight size={18} />
        </button>
        <button className="bz-journey-review" onClick={onReview}>
          <RotateCcw size={17} />
          <span>{due ? `${due} ideas to revisit` : "A little review"}</span>
          <ChevronRight size={17} />
        </button>
        <p>Learn at your pace. No clock. No pressure.</p>
      </div>
    </section>
  );
}
