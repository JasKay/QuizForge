"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Target,
  Clock,
  Flame,
  Trophy,
  Zap,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./ui/button";
import { subjects, type Question } from "@/lib/questions";
import type { Attempt } from "@/lib/types";
type SubjectStat = { subject: string; total: number; accuracy: number };
export default function Dashboard({
  total,
  accuracy,
  average,
  streak,
  chart,
  stats,
  bank,
  today,
  goal,
  weak,
  attempts,
  icons,
}: {
  total: number;
  accuracy: number;
  average: string;
  streak: number;
  chart: ReactNode;
  stats: SubjectStat[];
  bank: Question[];
  today: number;
  goal: number;
  weak?: SubjectStat;
  attempts: Attempt[];
  icons: LucideIcon[];
}) {
  return (
    <>
      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <Zap size={14} fill="currentColor" /> A LITTLE BETTER, EVERY DAY
          </span>
          <h2>
            Great teams are built
            <br />
            one answer at a time.
          </h2>
          <p>
            Find your rhythm. Build your knowledge.
            <br />
            Be ready when it’s your turn to buzz.
          </p>
          <Button asChild>
            <Link href="/practice">
              Jump into practice <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-ring r1" />
          <div className="art-ring r2" />
          <div className="art-ring r3" />
          <span className="spark s1">✦</span>
          <span className="spark s2">✧</span>
          <div className="art-card">
            <span className="art-card-top">
              <Zap size={14} /> YOUR POTENTIAL
            </span>
            <Trophy size={65} strokeWidth={1.3} />
            <strong>Limitless.</strong>
            <span>Keep showing up.</span>
          </div>
          <span className="art-tag tag-one">
            <CheckCircle2 size={15} /> Knowledge unlocked
          </span>
          <span className="art-tag tag-two">
            <Flame size={16} /> Build your momentum
          </span>
        </div>
      </section>
      <section className="stats-grid">
        {[
          [
            BookOpen,
            total.toLocaleString(),
            "Questions answered",
            "Every question is a step forward",
            "violet",
          ],
          [
            Target,
            `${accuracy}%`,
            "Overall accuracy",
            total
              ? "Based on your practice answers"
              : "Your first answer starts the story",
            "green",
          ],
          [
            Clock,
            `${average}s`,
            "Avg. response time",
            "Find your pace, then get faster",
            "blue",
          ],
          [
            Flame,
            `${streak} ${streak === 1 ? "day" : "days"}`,
            "Practice streak",
            streak
              ? "Keep the momentum going"
              : "A fresh start is a great start",
            "orange",
          ],
        ].map(([Icon, value, label, note, color]) => {
          const I = Icon as LucideIcon;
          return (
            <article className="card stat-card" key={String(label)}>
              <div className="stat-top">
                <span className={`icon-box ${color}`}>
                  <I size={19} />
                </span>
                <span className="stat-label">{String(label)}</span>
              </div>
              <strong className="stat-number">{String(value)}</strong>
              <span className="stat-note">{String(note)}</span>
            </article>
          );
        })}
      </section>
      <div className="dashboard-columns">
        <div className="dashboard-left">
          <section className="card activity-card">
            <div className="section-head">
              <div>
                <h2>Your learning momentum</h2>
                <p>Small steps add up. Here’s your accuracy this week.</p>
              </div>
              <span className="select-chip">Last 7 days</span>
            </div>
            <div className="chart-legend">
              <span /> Accuracy
            </div>
            {chart}
            {!total && (
              <p className="empty-caption">
                Your chart will come to life after your first session.
              </p>
            )}
          </section>
          <section>
            <div className="section-head outside">
              <h2>Find your next focus</h2>
              <Link href="/practice">
                All subjects <ArrowRight size={14} />
              </Link>
            </div>
            <div className="subject-mini-grid">
              {[2, 6, 0].map((i) => {
                const Icon = icons[i],
                  s = subjects[i],
                  st = stats[i];
                return (
                  <Link
                    href={`/practice?subject=${encodeURIComponent(s)}`}
                    className="card subject-mini"
                    key={s}
                  >
                    <span
                      className={`icon-box ${["blue", "violet", "orange"][[2, 6, 0].indexOf(i)]}`}
                    >
                      <Icon size={19} />
                    </span>
                    <h3>{s}</h3>
                    <p>
                      {st.total
                        ? `${st.accuracy}% accuracy`
                        : "Explore this subject"}
                    </p>
                    <div className="track">
                      <div style={{ width: `${st.accuracy}%` }} />
                    </div>
                    <span className="small muted">
                      {bank.filter((q) => q.subject === s).length} demo
                      questions <ArrowUpRight size={13} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
        <div className="dashboard-right">
          <section className="card daily-card">
            <div className="section-head">
              <span className="icon-box orange">
                <Zap size={19} />
              </span>
              <span className="daily-tag">DAILY CHALLENGE</span>
            </div>
            <h2>The daily five.</h2>
            <p>
              Five questions. A fresh mix.
              <br />A little sharper than yesterday.
            </p>
            <div className="daily-meta">
              <span>
                <BookOpen size={14} />5 questions
              </span>
              <span>
                <Clock size={14} />
                Your pace
              </span>
            </div>
            <Button asChild>
              <Link href="/practice?daily=1">
                Take the challenge <ArrowRight size={15} />
              </Link>
            </Button>
            <span className="tiny muted">A new set every day · UTC</span>
          </section>
          <section className="card goal-card">
            <div className="section-head">
              <h3>Today’s practice goal</h3>
              <Target size={17} className="muted" />
            </div>
            <div className="goal-value">
              <strong>
                {today}
                <span> / {goal}</span>
              </strong>
              <span>{Math.min(100, Math.round((today / goal) * 100))}%</span>
            </div>
            <div className="track">
              <div
                style={{
                  width: `${Math.min(100, (today / goal) * 100)}%`,
                }}
              />
            </div>
            <p>
              {today >= goal
                ? "Goal reached. That’s how habits are built."
                : `${Math.max(0, goal - today)} more questions. You’ve got this.`}
            </p>
          </section>
          <div className="tip">
            <span>✦</span>
            <div>
              <strong>A little tip for your next round</strong>
              <p>
                {weak
                  ? `Give ${weak.subject} a little extra attention. Targeted practice can make a difference.`
                  : "Mix subjects in your practice. Making connections helps knowledge stick."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <section className="card recent">
        <div className="section-head">
          <h2>Recent practice</h2>
          <Link href="/progress">
            View progress <ArrowRight size={14} />
          </Link>
        </div>
        {!total ? (
          <div className="empty-inline">
            <BookOpen size={22} />
            <span>
              Your first session is a fresh start. Let’s make it count.
            </span>
            <Link href="/practice">Start practising →</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Result</th>
                  <th>Response time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 5).map((a) => (
                  <tr key={a.id}>
                    <td>{a.subject}</td>
                    <td>
                      <span
                        className={a.correct ? "status-green" : "status-amber"}
                      >
                        {a.correct ? "Correct" : "For review"}
                      </span>
                    </td>
                    <td>{(a.elapsed_ms / 1000).toFixed(1)}s</td>
                    <td>{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
