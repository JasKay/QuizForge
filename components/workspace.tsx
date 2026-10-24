"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "./ui/button";
import {
  questions as demoQuestions,
  subjects,
  type Question,
} from "@/lib/questions";
import { configured, supabase } from "@/lib/supabase";
import { isCorrect } from "@/lib/scoring";
import { Landing } from "./landing";
import { UltimateChallenge } from "./ultimate-challenge";
import { RoomHub } from "./room-hub";
import { GameHeader } from "./game-header";
import { CategoryPicker } from "./category-picker";
import { ProfilePanel } from "./profile-panel";
import { GameRound } from "./game-round";
import { arcadePoints, shuffled, playSound } from "@/lib/game";
import type { Attempt, Profile, Result } from "@/lib/types";
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
    [goal, setGoal] = useState(10);
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
        name: loadLocal("qf-name", ""),
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
  const reviewIds = [
    ...new Set(attempts.filter((a) => !a.correct).map((a) => a.question_id)),
  ].filter((id) => !attempts.find((a) => a.question_id === id)?.correct);
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
    if (kind === "daily") kind = "normal";
    if (mode === "category" && !chosen)
      chosen = params.get("subject") || undefined;
    const isParty = false;
    const nextTimed = mode === "speed" ? true : mode ? false : timed;
    setTimed(nextTimed);
    setParty(isParty);
    setPlayers([
      (params.get("p1") || "Player 1").slice(0, 20),
      (params.get("p2") || "Player 2").slice(0, 20),
    ]);
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
      list = shuffled(list).slice(0, 5);
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
    async (timeout = false, chosen?: string) => {
      const response = chosen ?? answer;
      if (!current || result || submitting.current) return;
      if (!timeout && !response.trim()) return;
      submitting.current = true;
      setAnswer(response);
      setBusy(true);
      try {
        let r: Result;
        let a: Attempt;
        if (supabase) {
          const { data, error } = await supabase.rpc("submit_answer", {
            practice_id: session,
            question_id: current.id,
            response: timeout ? "" : response,
          });
          if (error) throw error;
          r = data.result;
          a = data.attempt;
        } else {
          r = {
            correct:
              !timeout &&
              (!timed || Date.now() - started.current <= 30000) &&
              isCorrect(response, [current.answer, ...current.alternatives]),
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
            answer: timeout ? "" : response,
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
        void fetch("/api/learn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: current.id,
            answer: timeout ? "" : response,
          }),
        }).catch(() => {});
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
      submit={(choice?: string) => void submit(false, choice)}
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
  const shell = (children: React.ReactNode) => (
    <div className="arcade trivia-app">
      <GameHeader />
      <main className="trivia-main">{children}</main>
    </div>
  );
  if (path === "/practice")
    return shell(
      quizUI ||
        (!ready ||
        (typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("mode")) ? (
          <p role="status">Loading…</p>
        ) : (
          <CategoryPicker
            subject={subject}
            difficulty={difficulty}
            setSubject={setSubject}
            setDifficulty={setDifficulty}
            bank={bank}
            start={() => void begin()}
            busy={busy}
          />
        )),
    );
  if (["/profile", "/settings", "/progress"].includes(path))
    return shell(
      <ProfilePanel
        profileName={profile?.name || ""}
        total={total}
        correct={correct}
        streak={streak}
        review={reviewIds.length}
        onSave={async (value) => {
          if (supabase && profile) {
            const { error } = await supabase
              .from("profiles")
              .update({ display_name: value })
              .eq("id", profile.id);
            if (error) throw error;
          }
          localStorage.setItem("qf-name", JSON.stringify(value));
          setProfile((p) => (p ? { ...p, name: value } : p));
        }}
      />,
    );
  if (path === "/review")
    return shell(
      quizUI || (
        <section className="review-picker">
          <div className="page-title">
            <p className="overline">PRACTICE</p>
            <h1>Review</h1>
          </div>
          <div className="review-count">
            <strong>{reviewIds.length}</strong>
            <p>
              {reviewIds.length
                ? "missed answers to revisit"
                : "No missed answers"}
            </p>
          </div>
          {reviewIds.length > 0 && (
            <button
              className="trivia-primary"
              onClick={() => void begin("review")}
            >
              Start review
              <ArrowRight size={18} />
            </button>
          )}
          <Link href="/profile" className="trivia-secondary">
            My Profile
          </Link>
        </section>
      ),
    );
  if (path === "/" || path === "/dashboard")
    return <Landing name={profile?.name} correct={correct} total={total} />;
  if (path === "/ultimate")
    return (
      <div className="arcade trivia-app">
        <GameHeader name={profile?.name} xp={correct * 100} />
        <main className="trivia-main">
          <UltimateChallenge />
        </main>
      </div>
    );
  if (path === "/rooms")
    return (
      <div className="arcade trivia-app">
        <GameHeader name={profile?.name} xp={correct * 100} />
        <main className="trivia-main">
          <RoomHub />
        </main>
      </div>
    );
  if (path === "/login")
    return (
      <div className="auth-wrap">
        <Link href="/" className="brand">
          <span className="logo">
            <Zap />
          </span>
          Trivia
        </Link>
        <form className="card auth-card" onSubmit={auth}>
          <span className="eyebrow">SIGN IN</span>
          <h1>{signup ? "Create account" : "Welcome back."}</h1>
          <p>{signup ? "" : ""}</p>
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
        Loading…
      </div>
    );
  if (configured && !profile)
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>Sign in</h1>
          <p>Sign in to save your sessions and track your progress.</p>
          {notice && <p role="alert">{notice}</p>}
          <Link className="trivia-primary" href="/login">
            Sign in
          </Link>
        </div>
      </div>
    );
  return <Landing />;
}
