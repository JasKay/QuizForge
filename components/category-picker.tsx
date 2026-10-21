"use client";
import { subjects, type Question } from "@/lib/questions";
import { ArrowRight } from "lucide-react";
export function CategoryPicker({
  subject,
  difficulty,
  setSubject,
  setDifficulty,
  bank,
  start,
  busy,
}: {
  subject: string;
  difficulty: string;
  setSubject: (v: string) => void;
  setDifficulty: (v: string) => void;
  bank: Question[];
  start: () => void;
  busy: boolean;
}) {
  const count = bank.filter(
    (q) =>
      (subject === "All subjects" || q.subject === subject) &&
      (difficulty === "All levels" || q.difficulty === difficulty),
  ).length;
  return (
    <section className="category-picker">
      <div className="page-title">
        <p className="overline">PRACTICE</p>
        <h1>Categories</h1>
        <p>Choose your focus.</p>
      </div>
      <div className="filter-fields">
        <label>
          Category
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Subject"
          >
            <option>All subjects</option>
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option>All levels</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>
      </div>
      <div className="category-match" aria-live="polite">
        <strong>{count.toLocaleString()}</strong>
        <span>questions available</span>
      </div>
      <button
        className="trivia-primary"
        disabled={busy || count === 0}
        onClick={start}
      >
        Start practice <ArrowRight size={18} />
      </button>
    </section>
  );
}
