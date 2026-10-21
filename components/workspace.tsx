"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
const AccuracyChart = dynamic(() => import("./accuracy-chart"), { ssr: false });
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Bookmark,
  Settings,
  ArrowUpRight,
  ArrowRight,
  Zap,
  Target,
  Clock,
  Flame,
  ChevronRight,
  Search,
  GraduationCap,
  Trophy,
  Check,
  Plus,
  Play,
  Menu,
  X,
  LogOut,
  Upload,
  Atom,
  Globe,
  Palette,
  Landmark,
  Library,
  Calculator,
  Flag,
  Brain,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  questions as demoQuestions,
  subjects,
  type Question,
} from "@/lib/questions";
import { configured, supabase } from "@/lib/supabase";
import { isCorrect } from "@/lib/scoring";
import { parseCSV } from "@/lib/csv";
import { Landing } from "./landing";
import { RoomHub } from "./room-hub";
import { GameLobby } from "./game-lobby";
import { GameHeader } from "./game-header";
import { GameRound } from "./game-round";
import { arcadePoints, shuffled, playSound } from "@/lib/game";
import { ReviewAnswer } from "./review-answer";
import type { Attempt, Profile, Result } from "@/lib/types";
const nav = [
  ["The lobby", "/dashboard", LayoutDashboard],
  ["Pick a category", "/practice", BookOpen],
  ["Team practice", "/rooms", Users],
  ["Competition", "/competition", Trophy],
  ["My teams", "/teams", GraduationCap],
  ["Progress", "/progress", BarChart3],
  ["Question review", "/review", Bookmark],
] as const;
const icons: LucideIcon[] = [
  Landmark,
  Library,
  Atom,
  Calculator,
  Globe,
  Flag,
  Users,
  Palette,
  Brain,
];
function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
function loadLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export default function Workspace() {
  const path = usePathname();
  const [ready, setReady] = useState(false),
    [profile, setProfile] = useState<Profile | null>(null),
    [bank, setBank] = useState<Question[]>(configured ? [] : demoQuestions),
    [attempts, setAttempts] = useState<Attempt[]>([]),
    [notice, setNotice] = useState(""),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [subject, setSubject] = useState("All subjects"),
    [difficulty, setDifficulty] = useState("All levels"),
    [timed, setTimed] = useState(false),
    [quiz, setQuiz] = useState<Question[]>([]),
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [seconds, setSeconds] = useState(30),
    [session, setSession] = useState(""),
    [summary, setSummary] = useState(false),
    [sessionCorrect, setSessionCorrect] = useState(0),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [signup, setSignup] = useState(false),
    [name, setName] = useState(""),
    [goal, setGoal] = useState(10),
    [importRows, setImportRows] = useState<ReturnType<typeof parseCSV>>([]);
  const [party, setParty] = useState(false),
    [players, setPlayers] = useState(["Player 1", "Player 2"]),
    [playerScores, setPlayerScores] = useState([0, 0]),
    [roundPoints, setRoundPoints] = useState(0),
    [lastPoints, setLastPoints] = useState(0),
    [combo, setCombo] = useState(0),
    [bestCombo, setBestCombo] = useState(0);
  const comboRef = useRef(0),
    launchedRoute = useRef("");
  const started = useRef(0),
    submitting = useRef(false),
    input = useRef<HTMLInputElement>(null);
  const current = quiz[index];
  const refresh = useCallback(async (user: { id: string; email?: string }) => {
    if (!supabase) return;
    const [p, a, q] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("attempts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("question_bank").select("*").order("id"),
    ]);
    if (p.error || a.error || q.error) {
      setNotice(
        "Could not load your workspace. Check the Supabase migrations and connection.",
      );
      return;
    }
    setProfile({
      id: user.id,
      email: user.email || "",
      name: p.data.display_name,
      role: p.data.role,
    });
    setGoal(p.data.daily_goal);
    setAttempts(a.data || []);
    setBank((q.data || []) as Question[]);
  }, []);
  useEffect(() => {
    setGoal(loadLocal("qf-goal", 10));
    if (!supabase) {
      setAttempts(loadLocal("qf-attempts", []));
      setProfile({
        id: "demo",
        name: loadLocal("qf-name", "Alex"),
        role: "student",
        email: "Local demo",
      });
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) setNotice(error.message);
      if (data.session) await refresh(data.session.user);
      if (active) setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) setTimeout(() => refresh(s.user), 0);
      else {
        setProfile(null);
        setAttempts([]);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refresh]);
  useEffect(() => {
    setQuiz([]);
    setSummary(false);
    setResult(null);
    setMobile(false);
    setSearch("");
    if (path !== "/practice") launchedRoute.current = "";
    if (path === "/practice") {
      const params = new URLSearchParams(window.location.search);
      setSubject(params.get("subject") || "All subjects");
    }
  }, [path]);
  const total = attempts.length,
    correct = attempts.filter((a) => a.correct).length,
    accuracy = total ? Math.round((correct / total) * 100) : 0,
    average = total
      ? (attempts.reduce((v, a) => v + a.elapsed_ms, 0) / total / 1000).toFixed(
          1,
        )
      : "0";
  const today = attempts.filter(
    (a) => a.created_at.slice(0, 10) === dayKey(),
  ).length;
  const stats = subjects.map((s) => {
    const a = attempts.filter((x) => x.subject === s);
    return {
      subject: s,
      total: a.length,
      accuracy: a.length
        ? Math.round((a.filter((x) => x.correct).length / a.length) * 100)
        : 0,
    };
  });
  const weak = [...stats]
    .filter((s) => s.total)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  const reviewIds = [
    ...new Set(attempts.filter((a) => !a.correct).map((a) => a.question_id)),
  ].filter((id) => !attempts.find((a) => a.question_id === id)?.correct);
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 6 + i);
    const a = attempts.filter((x) => x.created_at.slice(0, 10) === dayKey(d));
    return {
      day: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
      accuracy: a.length
        ? Math.round((a.filter((x) => x.correct).length / a.length) * 100)
        : 0,
    };
  });
  const activeDays = new Set(attempts.map((a) => a.created_at.slice(0, 10)));
  let streak = 0;
  const streakDate = new Date();
  if (!activeDays.has(dayKey(streakDate)))
    streakDate.setUTCDate(streakDate.getUTCDate() - 1);
  while (activeDays.has(dayKey(streakDate))) {
    streak++;
    streakDate.setUTCDate(streakDate.getUTCDate() - 1);
  }
  async function begin(kind = "normal", chosen?: string) {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "daily") kind = "daily";
    if (mode === "category" && !chosen)
      chosen = params.get("subject") || undefined;
    const isParty = mode === "party";
    const nextTimed = mode === "speed" ? true : mode ? false : timed;
    setTimed(nextTimed);
    setParty(isParty);
    setPlayers([
      (params.get("p1") || "Player 1").slice(0, 20),
      (params.get("p2") || "Player 2").slice(0, 20),
    ]);
    if (
      kind === "normal" &&
      !chosen &&
      new URLSearchParams(window.location.search).has("daily")
    )
      kind = "daily";
    setBusy(true);
    setNotice("");
    try {
      const roundSubject = chosen || (mode ? "All subjects" : subject);
      const roundDifficulty = mode ? "All levels" : difficulty;
      let list = bank.filter(
        (q) =>
          (roundSubject === "All subjects" || q.subject === roundSubject) &&
          (roundDifficulty === "All levels" ||
            q.difficulty === roundDifficulty),
      );
      if (kind === "review")
        list = bank.filter((q) => reviewIds.includes(q.id));
      if (kind === "daily") {
        const offset =
          Number(dayKey().replaceAll("-", "")) % Math.max(1, bank.length);
        list = [...bank.slice(offset), ...bank.slice(0, offset)].slice(0, 5);
      } else list = shuffled(list).slice(0, isParty ? 8 : 5);
      if (!list.length)
        throw Error(
          "No questions match these filters. Try another subject or level.",
        );
      let sid = crypto.randomUUID();
      if (supabase) {
        const { data, error } = await supabase.rpc("start_practice", {
          question_ids: list.map((q) => q.id),
          is_timed: nextTimed,
          practice_mode: kind,
        });
        if (error) throw error;
        sid = data;
      }
      setQuiz(list);
      setIndex(0);
      setSession(sid);
      setSessionCorrect(0);
      setRoundPoints(0);
      setPlayerScores([0, 0]);
      setCombo(0);
      setBestCombo(0);
      setLastPoints(0);
      comboRef.current = 0;
      setSummary(false);
      setResult(null);
      setAnswer("");
      setSeconds(30);
      started.current = Date.now();
      submitting.current = false;
      setTimeout(() => input.current?.focus(), 50);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!ready || !bank.length || path !== "/practice") return;
    const params = new URLSearchParams(window.location.search);
    const key = window.location.pathname + window.location.search;
    if (params.has("mode") && launchedRoute.current !== key) {
      launchedRoute.current = key;
      void begin();
    }
  }, [ready, bank, path]);
  const submit = useCallback(
    async (timeout = false) => {
      if (!current || result || submitting.current) return;
      if (!timeout && !answer.trim()) return;
      submitting.current = true;
      setBusy(true);
      try {
        let r: Result;
        let a: Attempt;
        if (supabase) {
          const { data, error } = await supabase.rpc("submit_answer", {
            practice_id: session,
            question_id: current.id,
            response: timeout ? "" : answer,
          });
          if (error) throw error;
          r = data.result;
          a = data.attempt;
        } else {
          r = {
            correct:
              !timeout &&
              (!timed || Date.now() - started.current <= 30000) &&
              isCorrect(answer, [current.answer, ...current.alternatives]),
            answer: current.answer,
            explanation: current.explanation,
            source: current.source,
          };
          a = {
            id: crypto.randomUUID(),
            question_id: current.id,
            correct: r.correct,
            elapsed_ms: timed
              ? Math.min(30000, Date.now() - started.current)
              : Date.now() - started.current,
            created_at: new Date().toISOString(),
            subject: current.subject,
            answer: timeout ? "" : answer,
            session_id: session,
          };
        }
        const nextCombo = r.correct ? comboRef.current + 1 : 0;
        comboRef.current = nextCombo;
        setCombo(nextCombo);
        setBestCombo((old) => Math.max(old, nextCombo));
        const earned = arcadePoints(
          r.correct,
          a.elapsed_ms,
          timed,
          party ? 1 : nextCombo,
        );
        setLastPoints(earned);
        setRoundPoints((old) => old + earned);
        if (party)
          setPlayerScores((old) =>
            old.map((score, i) => (i === index % 2 ? score + earned : score)),
          );
        playSound(r.correct ? "correct" : "miss");
        setResult(r);
        if (r.correct) setSessionCorrect((n) => n + 1);
        setAttempts((old) => {
          const updated = [a, ...old.filter((x) => x.id !== a.id)];
          if (!configured)
            localStorage.setItem("qf-attempts", JSON.stringify(updated));
          return updated;
        });
      } catch (e) {
        setNotice((e as Error).message);
        submitting.current = false;
      } finally {
        setBusy(false);
      }
    },
    [current, result, answer, session, timed, party, index],
  );
  useEffect(() => {
    if (!current || result || !timed || summary) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        30 - Math.floor((Date.now() - started.current) / 1000),
      );
      setSeconds(remaining);
      if (remaining === 0) void submit(true);
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [current, result, timed, summary, submit]);
  async function next() {
    if (index + 1 === quiz.length) {
      setSummary(true);
      return;
    }
    if (supabase) {
      setBusy(true);
      const { error } = await supabase.rpc("advance_practice", {
        practice_id: session,
      });
      setBusy(false);
      if (error) {
        setNotice(error.message);
        return;
      }
    }
    setIndex((i) => i + 1);
    setAnswer("");
    setResult(null);
    setSeconds(30);
    started.current = Date.now();
    submitting.current = false;
    setTimeout(() => input.current?.focus(), 50);
  }
  async function auth(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setNotice(
        "Add the Supabase environment variables to enable accounts. You can use the local demo now.",
      );
      return;
    }
    setBusy(true);
    const { error, data } = signup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name || "Learner" } },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setNotice(error.message);
    else if (!data.session)
      setNotice("Check your email to confirm your account, then sign in.");
    else window.location.href = "/dashboard";
  }
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (supabase && profile) {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name || profile.name, daily_goal: goal })
        .eq("id", profile.id);
      if (error) {
        setNotice(error.message);
        return;
      }
    } else
      localStorage.setItem(
        "qf-name",
        JSON.stringify(name || profile?.name || "Alex"),
      );
    setProfile((p) => (p ? { ...p, name: name || p.name } : p));
    localStorage.setItem("qf-goal", String(goal));
    setNotice("Preferences saved.");
  }
  async function importQuestions() {
    if (!supabase || profile?.role !== "admin") {
      setNotice("Imports require a connected administrator account.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("import_questions", {
      items: importRows,
    });
    setBusy(false);
    if (error) setNotice(error.message);
    else {
      setNotice(`${importRows.length} questions imported for review.`);
      setImportRows([]);
    }
  }
  const linkButton = (href: string, label: string) => (
    <Button asChild>
      <Link href={href}>
        {label}
        <ArrowRight size={16} />
      </Link>
    </Button>
  );
  const chart = <AccuracyChart history={history} />;
  const quizUI = current ? (
    <GameRound
      key={`${session}:${index}`}
      question={current}
      index={index}
      length={quiz.length}
      timed={timed}
      seconds={seconds}
      answer={answer}
      setAnswer={setAnswer}
      result={result}
      busy={busy}
      submit={() => void submit()}
      next={() => void next()}
      summary={summary}
      correct={sessionCorrect}
      points={roundPoints}
      lastPoints={lastPoints}
      combo={combo}
      bestCombo={bestCombo}
      input={input}
      party={party}
      players={players}
      playerScores={playerScores}
      onReplay={() => void begin(path === "/review" ? "review" : "normal")}
    />
  ) : null;
  if (path === "/")
    return <Landing name={profile?.name} correct={correct} total={total} />;
  if (path === "/rooms")
    return (
      <div className="arcade">
        <GameHeader name={profile?.name} xp={correct * 100} />
        <main className="game-container">
          <RoomHub />
        </main>
        <footer className="game-footer">
          <span>Team practice. Every phone.</span>
          <span>Original demo questions · Independent of Honda & HCASC</span>
        </footer>
      </div>
    );
  if (path === "/login")
    return (
      <div className="auth-wrap">
        <Link href="/" className="brand">
          <span className="logo">
            <Zap />
          </span>
          QuizForge.
        </Link>
        <form className="card auth-card" onSubmit={auth}>
          <span className="eyebrow">YOUR COMPETITIVE EDGE</span>
          <h1>{signup ? "Start something great." : "Welcome back."}</h1>
          <p>
            {signup
              ? "Build your knowledge, one question at a time."
              : "Your next great answer is waiting."}
          </p>
          {signup && (
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {notice && <p role="status">{notice}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            <ArrowRight size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSignup(!signup)}
          >
            {signup
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Button>
          {!configured && (
            <p className="small">
              Accounts need Supabase configuration.{" "}
              <Link href="/dashboard">Explore the local demo →</Link>
            </p>
          )}
        </form>
      </div>
    );
  if (!ready)
    return (
      <div className="loading">
        <Zap />
        Warming up the buzzers…
      </div>
    );
  if (configured && !profile)
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>Your training space awaits.</h1>
          <p>Sign in to save your sessions and track your progress.</p>
          {notice && <p role="alert">{notice}</p>}
          {linkButton("/login", "Sign in")}
        </div>
      </div>
    );
  return (
    <div className="app-shell arcade">
      <div className="main-shell">
        <GameHeader name={profile?.name} xp={correct * 100} />

        <main className="content">
          <div
            className={`page-heading ${path === "/dashboard" || current ? "game-hidden" : ""}`}
          >
            <div>
              <span className="eyebrow">
                {path === "/dashboard"
                  ? "LET’S MAKE TODAY COUNT"
                  : path === "/practice"
                    ? "SOLO TRAINING"
                    : path === "/review"
                      ? "LEARN. REVISIT. REMEMBER."
                      : "YOUR WORKSPACE"}
              </span>
              <h1>
                {path === "/dashboard"
                  ? `Welcome back, ${profile?.name.split(" ")[0]}.`
                  : nav.find((x) => x[1] === path)?.[0] ||
                    (path === "/settings" ? "Settings" : "What’s coming next")}
              </h1>
              <p>
                {path === "/dashboard"
                  ? "Your training, at a glance."
                  : path === "/practice"
                    ? "A little practice. A big difference."
                    : path === "/review"
                      ? "Turn missed answers into strengths."
                      : "Build your competitive edge."}
              </p>
            </div>
            {path === "/dashboard" && (
              <Button asChild>
                <Link href="/practice">
                  <Plus size={17} />
                  New practice
                </Link>
              </Button>
            )}
          </div>
          {!configured && (
            <div className="demo-banner">
              <span>
                <span className="live-dot" /> Demo workspace · Original sample
                questions. Progress saves in this browser.
              </span>
              <Link href="/login">
                Connect an account <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}{" "}
          {path === "/dashboard" && (
            <GameLobby name={profile?.name} correct={correct} total={total} />
          )}
          {path === "/practice" && (
            <>
              {quizUI || (
                <>
                  <div className="practice-intro card">
                    <span className="icon-box violet">
                      <BookOpen />
                    </span>
                    <div>
                      <h2>Choose your next challenge.</h2>
                      <p>
                        {bank.length} original demonstration questions across{" "}
                        {subjects.length} subjects. Accuracy grows with
                        practice.
                      </p>
                    </div>
                    <Button disabled={busy} onClick={() => begin("daily")}>
                      The daily five <Zap size={16} />
                    </Button>
                  </div>
                  <div className="filters">
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label="Search question bank"
                        placeholder="Search questions or subjects…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option>All subjects</option>
                      {subjects.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      {["All levels", "Easy", "Medium", "Hard"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={timed}
                        onChange={(e) => setTimed(e.target.checked)}
                      />
                      30s per question
                    </label>
                    <Button disabled={busy} onClick={() => begin()}>
                      Start practice <Play size={15} />
                    </Button>
                  </div>
                  <div className="category-grid">
                    {subjects
                      .filter((s) =>
                        s.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((s) => {
                        const Icon = icons[subjects.indexOf(s)];
                        const count = bank.filter(
                          (q) =>
                            q.subject === s &&
                            (difficulty === "All levels" ||
                              q.difficulty === difficulty),
                        ).length;
                        return (
                          <article className="card category" key={s}>
                            <span
                              className={`icon-box ${["violet", "blue", "orange", "green"][subjects.indexOf(s) % 4]}`}
                            >
                              <Icon size={23} />
                            </span>
                            <h3>{s}</h3>
                            <p>
                              {count} original demo{" "}
                              {count === 1 ? "question" : "questions"}
                            </p>
                            <Button
                              variant="ghost"
                              disabled={busy || !count}
                              onClick={() => begin("normal", s)}
                            >
                              Practise subject <ArrowRight size={15} />
                            </Button>
                          </article>
                        );
                      })}
                  </div>
                  <section className="card question-list">
                    <div className="section-head">
                      <h2>Inside the question bank</h2>
                      <span className="tag">ORIGINAL DEMONSTRATION SET</span>
                    </div>
                    {bank
                      .filter(
                        (q) =>
                          (subject === "All subjects" ||
                            q.subject === subject) &&
                          (difficulty === "All levels" ||
                            q.difficulty === difficulty) &&
                          `${q.text} ${q.subject}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((q) => (
                        <div className="question-row" key={q.id}>
                          <div>
                            <span className="small muted">
                              {q.subject} · {q.difficulty}
                            </span>
                            <p>{q.text}</p>
                          </div>
                          <BookOpen size={18} />
                        </div>
                      ))}
                  </section>
                </>
              )}
            </>
          )}
          {path === "/progress" && (
            <>
              <div className="stats-grid three">
                <article className="card stat-card">
                  <span className="muted">Questions answered</span>
                  <strong className="stat-number">{total}</strong>
                </article>
                <article className="card stat-card">
                  <span className="muted">Correct answers</span>
                  <strong className="stat-number">{correct}</strong>
                </article>
                <article className="card stat-card">
                  <span className="muted">Overall accuracy</span>
                  <strong className="stat-number">{accuracy}%</strong>
                </article>
              </div>
              <div className="two-grid">
                <section className="card">
                  <h2>Your last seven days</h2>
                  {chart}
                </section>
                <section className="card">
                  <h2>Strengths & next steps</h2>
                  <p>
                    {weak
                      ? `Focus on ${weak.subject} next. Your accuracy there is ${weak.accuracy}%.`
                      : "Complete a practice set to discover your strengths and focus areas."}
                  </p>
                  {stats.map((s) => (
                    <div className="subject-progress" key={s.subject}>
                      <div>
                        <span>{s.subject}</span>
                        <span>
                          {s.total ? `${s.accuracy}%` : "No attempts"}
                        </span>
                      </div>
                      <div className="track">
                        <div style={{ width: `${s.accuracy}%` }} />
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )}
          {path === "/review" && (
            <>
              {quizUI || (
                <>
                  <div className="practice-intro card">
                    <span className="icon-box orange">
                      <Bookmark />
                    </span>
                    <div>
                      <h2>
                        {reviewIds.length} questions, another opportunity.
                      </h2>
                      <p>
                        Missed answers stay here until you answer them
                        correctly.
                      </p>
                    </div>
                    <Button
                      disabled={!reviewIds.length || busy}
                      onClick={() => begin("review")}
                    >
                      Practise review queue <ArrowRight size={16} />
                    </Button>
                  </div>
                  {reviewIds.length ? (
                    bank
                      .filter((q) => reviewIds.includes(q.id))
                      .map((q) => (
                        <article className="card review-card" key={q.id}>
                          <span className="tag">{q.subject}</span>
                          <h3>{q.text}</h3>
                          <details>
                            <summary>Show answer and explanation</summary>
                            <ReviewAnswer question={q} />
                          </details>
                        </article>
                      ))
                  ) : (
                    <section className="card center empty-state">
                      <CheckCircle2 size={38} />
                      <h2>A clean slate.</h2>
                      <p>
                        Questions you miss during practice will appear here.
                      </p>
                      {linkButton("/practice", "Keep learning")}
                    </section>
                  )}
                </>
              )}
            </>
          )}
          {path === "/settings" && (
            <div className="two-grid">
              <form className="card settings-form" onSubmit={saveProfile}>
                <h2>Your profile</h2>
                <label>
                  Display name
                  <input
                    maxLength={80}
                    value={name || profile?.name || ""}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Email
                  <input readOnly value={profile?.email || ""} />
                </label>
                <label>
                  Daily question goal
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={goal}
                    onChange={(e) => setGoal(Number(e.target.value))}
                  />
                </label>
                <p className="small muted">
                  Role: {profile?.role}. Roles are assigned by your
                  administrator.
                </p>
                <Button>
                  Save preferences <Check size={16} />
                </Button>
              </form>
              <section className="card">
                <h2>Question management</h2>
                <p>
                  Administrators can import up to 500 questions per CSV. Imports
                  start pending review and stay hidden until approved in the
                  database.
                </p>
                <p className="small">
                  Required columns: text, answer, subject, difficulty,
                  explanation, source. Optional: alternatives, tags,
                  subcategory. Separate alternatives and tags with |.
                </p>
                <label className="upload">
                  <Upload size={20} />
                  Choose CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={!configured || profile?.role !== "admin"}
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2000000)
                          throw Error("CSV must be smaller than 2 MB");
                        setImportRows(parseCSV(await file.text()));
                        setNotice(
                          "CSV validated. Review the preview before importing.",
                        );
                      } catch (e) {
                        setNotice((e as Error).message);
                      }
                    }}
                  />
                </label>
                {importRows.length > 0 && (
                  <>
                    <p>{importRows.length} questions ready to import.</p>
                    {importRows.slice(0, 5).map((r, i) => (
                      <p className="small" key={i}>
                        {r.subject}: {r.text}
                      </p>
                    ))}
                    <Button disabled={busy} onClick={importQuestions}>
                      Import {importRows.length} questions
                    </Button>
                  </>
                )}
                {(!configured || profile?.role !== "admin") && (
                  <p className="small muted">
                    Connect Supabase and sign in as an administrator to enable
                    imports.
                  </p>
                )}
              </section>
            </div>
          )}
          {["/teams", "/rooms", "/coach", "/competition"].includes(path) && (
            <section className="card center empty-state">
              <span className="big-icon">
                <Users size={40} />
              </span>
              <span className="eyebrow">THE NEXT CHAPTER</span>
              <h2>
                {path === "/competition"
                  ? "Get ready for game day."
                  : path === "/coach"
                    ? "Bring out your team’s best."
                    : "Better, together."}
              </h2>
              <p>
                {path === "/rooms"
                  ? "Live practice rooms, server-ordered buzzers, and moderator controls are planned for Phase 2."
                  : path === "/teams"
                    ? "Team invitations, shared practice sessions, and session history are planned for Phase 2."
                    : path === "/coach"
                      ? "Assignments, player analytics, and team progress are planned for Phase 3."
                      : "Face-Off, Bonus, and Ultimate Challenge simulations with configurable scoring are planned for Phase 3."}
              </p>
              <span className="tag">NOT YET AVAILABLE</span>
              <p>Build your foundation with solo training today.</p>
              {linkButton("/practice", "Start solo practice")}
            </section>
          )}
          {![
            "/dashboard",
            "/practice",
            "/progress",
            "/review",
            "/settings",
            "/teams",
            "/rooms",
            "/coach",
            "/competition",
          ].includes(path) && (
            <section className="card empty-state">
              <h2>This page isn’t in the playbook.</h2>
              {linkButton("/dashboard", "Back to dashboard")}
            </section>
          )}
          <footer className="app-footer">
            <span>
              QuizForge <span className="footer-dot">✦</span> A little sharper,
              every day.
            </span>
            <span>
              Independent training. Not affiliated with Honda or HCASC.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
