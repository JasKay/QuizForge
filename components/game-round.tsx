"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Zap,
  ArrowRight,
  Trophy,
  Flame,
  RotateCcw,
  Home,
  Check,
  Timer,
  Star,
  Volume2,
} from "lucide-react";
import type { Question } from "@/lib/questions";
import type { Result } from "@/lib/types";
import { AnswerChoices } from "./answer-choices";
import { choicesForQuestion, questionStem } from "@/lib/choices";
import { questions } from "@/lib/questions";
import { playSound } from "@/lib/game";
type Props = {
  question: Question;
  index: number;
  length: number;
  timed: boolean;
  seconds: number;
  answer: string;
  setAnswer: (v: string) => void;
  result: Result | null;
  busy: boolean;
  submit: (choice?: string) => void;
  next: () => void;
  summary: boolean;
  correct: number;
  points: number;
  lastPoints: number;
  combo: number;
  bestCombo: number;
  input: RefObject<HTMLInputElement | null>;
  party: boolean;
  players: string[];
  playerScores: number[];
  onReplay: () => void;
};
export function GameRound(p: Props) {
  const [buzzed, setBuzzed] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  function buzz() {
    if (p.busy || p.result) return;
    playSound("buzz");
    setBuzzed(true);
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !buzzed &&
        !p.result &&
        !p.summary &&
        !p.busy &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        buzz();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [buzzed, p.result, p.summary, p.busy]);
  const stars =
    p.correct / p.length >= 0.8
      ? 3
      : p.correct / p.length >= 0.5
        ? 2
        : p.correct
          ? 1
          : 0;
  const winner =
    p.playerScores[0] === p.playerScores[1]
      ? "It’s a tie!"
      : `${p.players[p.playerScores[0] > p.playerScores[1] ? 0 : 1]} takes the crown!`;
  if (p.summary)
    return (
      <section className="game-results quiz-card">
        <Confetti />
        <span className="game-eyebrow">THAT’S A WRAP</span>
        <div className="results-trophy">
          <Trophy size={61} />
        </div>
        <div className="result-stars" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              size={31}
              fill={i < stars ? "currentColor" : "none"}
              className={i < stars ? "earned" : ""}
            />
          ))}
        </div>
        <h1>
          {p.party
            ? winner
            : p.correct === p.length
              ? "Round complete"
              : p.correct >= p.length / 2
                ? "Round complete"
                : "Round complete"}
        </h1>
        <p>
          {p.party
            ? "Same friends. New bragging rights."
            : `${p.correct} of ${p.length} correct. `}
        </p>
        {p.party ? (
          <div className="party-results">
            {p.players.map((player, i) => (
              <div
                key={i}
                className={
                  p.playerScores[i] === Math.max(...p.playerScores)
                    ? "winning"
                    : ""
                }
              >
                <span>PLAYER {i + 1}</span>
                <strong>{player}</strong>
                <b>
                  {p.playerScores[i].toLocaleString()} <small>PTS</small>
                </b>
              </div>
            ))}
          </div>
        ) : (
          <div className="result-score">
            <strong>{p.points.toLocaleString()}</strong>
            <span>ROUND POINTS</span>
          </div>
        )}
        <div className="result-facts">
          <div>
            <Zap size={20} />
            <strong>+{p.correct * 100}</strong>
            <span>XP earned</span>
          </div>
          <div>
            <Flame size={20} />
            <strong>{p.bestCombo}×</strong>
            <span>Best streak</span>
          </div>
          <div>
            <Check size={20} />
            <strong>{Math.round((p.correct / p.length) * 100)}%</strong>
            <span>Accuracy</span>
          </div>
        </div>
        <div className="result-buttons">
          <button className="game-button primary" onClick={p.onReplay}>
            <RotateCcw size={18} />
            One more round
          </button>
          <Link className="game-button secondary" href="/dashboard">
            <Home size={18} />
            Back to the lobby
          </Link>
        </div>
        <Link className="review-results-link" href="/review">
          Review answers <ArrowRight size={14} />
        </Link>
        <small className="game-save-note">
          Your answered questions are saved. Round points are for this game.
        </small>
      </section>
    );
  return (
    <section
      className="game-round quiz-card"
      data-focus="true"
      data-phase={p.result ? "resolved" : "open"}
    >
      <div className="round-top">
        <Link href="/dashboard" className="round-exit">
          <Home size={17} />
          Lobby
        </Link>
        <span className="round-mode">
          {p.party
            ? "PASS & PLAY"
            : p.timed
              ? "BEAT THE CLOCK"
              : "QUICK THINKING"}
        </span>
        <div className="round-score">
          <Star size={17} fill="currentColor" />
          <strong>{p.points.toLocaleString()}</strong>
          <span>PTS</span>
        </div>
      </div>
      {p.party && (
        <div className="party-scoreboard">
          {p.players.map((player, i) => (
            <div className={p.index % 2 === i ? "playing" : ""} key={i}>
              <span className="party-avatar">{i + 1}</span>
              <span>
                {player}
                <small>{p.index % 2 === i ? "YOU’RE UP" : "NEXT TURN"}</small>
              </span>
              <strong>
                {p.playerScores[i]}
                <small>PTS</small>
              </strong>
            </div>
          ))}
        </div>
      )}
      <div className="round-progress">
        <div
          className="round-dots"
          aria-label={`Question ${p.index + 1} of ${p.length}`}
        >
          {Array.from({ length: p.length }, (_, i) => (
            <span
              key={i}
              className={i < p.index ? "done" : i === p.index ? "now" : ""}
            />
          ))}
        </div>
        <span>
          {String(p.index + 1).padStart(2, "0")}
          <small> / {String(p.length).padStart(2, "0")}</small>
        </span>
      </div>
      <div className="question-stage">
        <div className="question-stage-top">
          <span className="question-subject">
            {p.question.subject}
            <span>✦</span>
            {p.question.difficulty}
          </span>
          {p.timed ? (
            <div
              className={`game-timer ${p.seconds < 10 ? "urgent" : ""}`}
              aria-label={`${p.seconds} seconds remaining`}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity=".15"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={126}
                  strokeDashoffset={126 * (1 - p.seconds / 30)}
                  transform="rotate(-90 24 24)"
                />
              </svg>
              <strong>{p.seconds}</strong>
            </div>
          ) : (
            <span className="no-rush">
              <Timer size={15} />
            </span>
          )}
        </div>
        <span className="question-number">QUESTION {p.index + 1}</span>
        <h1>{questionStem(p.question.text)}</h1>
        <AnswerChoices
          options={choicesForQuestion(p.question, questions)}
          disabled={!buzzed || !!p.result || p.busy}
          selected={p.answer}
          onChoose={(choice) => p.submit(choice)}
        />
        {!buzzed && !p.result ? (
          <div className="buzz-zone">
            <button
              className="play-buzzer"
              onClick={buzz}
              disabled={p.busy}
              aria-label="Buzz in"
            >
              <Zap size={32} fill="currentColor" />
            </button>
            <strong>1. Buzz in first</strong>
            <span>
              Tap the buzzer or hit <kbd>space</kbd>
            </span>
          </div>
        ) : (
          <p className="choice-instruction">
            {p.result ? "" : p.busy ? "Checking…" : "2. Choose your answer."}
          </p>
        )}
      </div>
      {p.result && (
        <div
          ref={feedback}
          className={`game-feedback ${p.result.correct ? "correct" : "incorrect"}`}
          role="status"
        >
          {p.result.correct && <Confetti />}
          <div className="feedback-head">
            <span className="feedback-symbol">
              {p.result.correct ? <Check size={26} /> : <RotateCcw size={24} />}
            </span>
            <div>
              <strong>{p.result.correct ? "Correct" : "Incorrect"}</strong>
              <span>
                {p.result.correct
                  ? p.combo > 1
                    ? `${p.combo} in a row. You’re on fire!`
                    : ""
                  : ""}
              </span>
            </div>
            <b>
              {p.result.correct ? `+${p.lastPoints}` : "+0"}
              <small>POINTS</small>
            </b>
          </div>
          <div className="feedback-explanation">
            <h2>{p.result.answer}</h2>
            <p>{p.result.explanation}</p>
            <a href={p.result.source} target="_blank" rel="noreferrer">
              Check the reference ↗
            </a>
          </div>
          <button
            className="game-button primary"
            disabled={p.busy}
            onClick={p.next}
          >
            {p.index + 1 === p.length
              ? "The final scores"
              : p.party
                ? `Pass to ${p.players[(p.index + 1) % 2]}`
                : "Next question"}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
function Confetti() {
  return (
    <div className="game-confetti" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${i * 6.3}%`,
            background: ["#d9fa70", "#8b61d6", "#fca97d", "#f5c5e2"][i % 4],
            animationDelay: `${(i % 4) * 0.08}s`,
            transform: `rotate(${i * 23}deg)`,
          }}
        />
      ))}
    </div>
  );
}
