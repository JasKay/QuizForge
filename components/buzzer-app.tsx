"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Grid2X2,
  Landmark,
  Link as LinkIcon,
  LogOut,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Timer,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { BuzzerShell, BuzzerLogo } from "./buzzer-shell";
import { playSound, unlockSound } from "@/lib/game";

type Catalog = {
  id: string;
  title: string;
  intro: string;
  icon: string;
  subject: string;
  learned: number;
  total: number;
};
type StudyQuestion = {
  id: string;
  text: string;
  choices: string[];
  source: string;
  study: { answer: string; explanation: string } | null;
};
type Progress = {
  catalog: Catalog[];
  due: number;
  total: number;
  correct: number;
  attempts: number;
  questions: StudyQuestion[];
};
type Team = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  school: string | null;
  room_code: string | null;
  members: { id: string; name: string }[];
};
type Challenge = {
  id: string;
  from_team: string;
  to_team: string;
  from_name: string;
  to_name: string;
  scheduled_at: string;
  status: string;
  room_code: string | null;
};
type Teams = {
  team: Team | null;
  available: {
    id: string;
    name: string;
    school: string | null;
    members: number;
  }[];
  challenges: Challenge[];
};
type Feedback = {
  correct: boolean;
  answer: string;
  explanation: string;
  source: string;
};
async function api<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error || data.message || "Please try again.");
  return data as T;
}
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      className="bz-dialog"
      ref={ref}
      aria-labelledby="bz-dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="bz-dialog-bar">
        <span className="bz-eyebrow">BUZZER!</span>
        <button
          className="bz-icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      <h2 id="bz-dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
function Row({
  title,
  description,
  Icon = ArrowRight,
  href,
  onClick,
}: {
  title: string;
  description: string;
  Icon?: typeof ArrowRight;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="bz-row-icon">
        <Icon size={22} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight size={19} />
    </>
  );
  return href ? (
    <Link className="bz-row" href={href}>
      {content}
    </Link>
  ) : (
    <button className="bz-row" onClick={onClick}>
      {content}
    </button>
  );
}
function ModeSwitch({
  mode,
  setMode,
}: {
  mode: string;
  setMode: (v: string) => void;
}) {
  return (
    <div className="bz-switch" aria-label="Play mode">
      {["Practice", "Competition"].map((m) => (
        <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
          {m}
        </button>
      ))}
    </div>
  );
}
export default function BuzzerApp() {
  const path = usePathname(),
    router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [progress, setProgress] = useState<Progress | null>(null),
    [teams, setTeams] = useState<Teams | null>(null),
    [mode, setMode] = useState("Practice"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [modal, setModal] = useState<string | null>(null),
    [passwordVisible, setPasswordVisible] = useState(false);
  const [lesson, setLesson] = useState<{
      title: string;
      intro: string;
      questions: StudyQuestion[];
      stage: "study" | "quiz" | "done";
      index: number;
      score: number;
    } | null>(null),
    [feedback, setFeedback] = useState<Feedback | null>(null),
    [selectedAnswer, setSelectedAnswer] = useState("");
  const [lessonSaveError, setLessonSaveError] = useState("");
  const loadProgress = useCallback(async () => {
    const data = await api<Progress>("/api/learn");
    setProgress(data);
    return data;
  }, []);
  const loadTeams = useCallback(async () => {
    const data = await api<Teams>("/api/teams");
    setTeams(data);
    return data;
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setNotice("");
    (path === "/teams" ? loadTeams() : loadProgress())
      .catch((e) => {
        if (active) setNotice(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, path, loadProgress, loadTeams]);
  useEffect(() => {
    if (!user || path !== "/teams") return;
    const timer = setInterval(() => {
      if (!document.hidden) void loadTeams().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [user?.id, path, loadTeams]);
  useEffect(() => {
    if (!user) {
      setProgress(null);
      setTeams(null);
      setLesson(null);
    }
  }, [user?.id]);
  useEffect(() => {
    setMode("Practice");
    setModal(null);
    setNotice("");
  }, [path]);
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await task();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function needAccount(action: () => void) {
    if (!user) {
      router.push("/signup");
      return;
    }
    action();
  }
  async function startLesson(id?: string, review = false) {
    await run(async () => {
      const data = await api<Progress>(
        review
          ? "/api/learn?review=1"
          : `/api/learn?lesson=${encodeURIComponent(id || "major-museums")}`,
      );
      if (!data.questions.length) {
        setNotice(
          "You’re all caught up. Explore a new topic while your next review gets ready.",
        );
        return;
      }
      const item = data.catalog.find((l) => l.id === id);
      setFeedback(null);
      setSelectedAnswer("");
      setLessonSaveError("");
      setLesson({
        title: review ? "A little review" : item?.title || "Your next session",
        intro: item?.intro || "Bring a few ideas back to mind.",
        questions: data.questions,
        stage: review ? "quiz" : "study",
        index: 0,
        score: 0,
      });
    });
  }
  async function answer(value: string) {
    if (!lesson || feedback || busy) return;
    unlockSound();
    await run(async () => {
      try {
        const result = await api<Feedback>("/api/learn", {
          questionId: lesson.questions[lesson.index].id,
          answer: value,
        });
        setSelectedAnswer(value);
        setFeedback(result);
        playSound(result.correct ? "correct" : "miss");
        setLesson((old) =>
          old ? { ...old, score: old.score + Number(result.correct) } : old,
        );
        setLessonSaveError("");
      } catch (e) {
        setLessonSaveError(
          "Your answer wasn’t saved. Check your connection and try again.",
        );
        throw e;
      }
    });
  }
  function nextQuestion() {
    if (!lesson) return;
    setFeedback(null);
    setSelectedAnswer("");
    if (lesson.index + 1 >= lesson.questions.length) {
      setLesson({ ...lesson, stage: "done" });
      void loadProgress().catch(() => {});
    } else setLesson({ ...lesson, index: lesson.index + 1 });
  }
  async function teamAction(body: Record<string, unknown>) {
    await api("/api/teams", body);
    await loadTeams();
    setModal(null);
  }
  async function createRoom(challengeId?: string) {
    await run(async () => {
      if (!user) return;
      const data = await api<{ room: { code: string } }>("/api/rooms", {
        action: "create",
        name: user.name.slice(0, 32),
        mode: challengeId ? "hcasc" : "classic",
        title: teams?.team?.name || "Team practice",
      });
      await api("/api/teams", {
        action: "room",
        code: data.room.code,
        challengeId,
      });
      router.push(`/rooms?code=${data.room.code}`);
    });
  }
  const primary = (label: string, onClick: () => void, dark = false) => (
    <button
      className={`bz-primary ${dark ? "bz-primary-dark" : ""}`}
      disabled={busy}
      onClick={onClick}
    >
      {busy ? "One moment…" : label}
      <ArrowRight size={18} />
    </button>
  );
  if (isPending)
    return (
      <div className="buzzer-app bz-loading" role="status">
        <BuzzerLogo />
        <p>Getting things ready…</p>
      </div>
    );
  if ((path === "/" || path === "/welcome") && !user)
    return (
      <div className="buzzer-app bz-welcome">
        <header>
          <BuzzerLogo />
          <Link href="/login">
            Sign in <ArrowRight size={16} />
          </Link>
        </header>
        <div className="bz-welcome-copy">
          <p className="bz-eyebrow">LEARN / PRACTICE / COMPETE</p>
          <h1>
            Big curiosity.
            <br />
            Quick thinking.
            <br />
            <em>Your move.</em>
          </h1>
          <p>Learn a little. Play a lot.</p>
        </div>
        <img
          className="bz-welcome-buzzer"
          src="/buzzer-design/assets/buzzer.png"
          alt="A lime green quiz buzzer"
        />
        <section className="bz-welcome-bottom">
          <h2>
            Build your knowledge.
            <br />
            Bring it to the game.
          </h2>
          <Link href="/signup" className="bz-primary">
            Get started <ArrowRight size={20} />
          </Link>
          <Link className="bz-guest" href="/play">
            Just looking? Try a quick game <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    );
  if (path === "/login" || path === "/signup")
    return (
      <div className="buzzer-app bz-auth">
        <Link href="/" aria-label="Home">
          <BuzzerLogo />
        </Link>
        <div className="bz-auth-heading">
          <span className="bz-eyebrow">YOUR OWN LITTLE EDGE</span>
          <h1>
            {path === "/signup" ? (
              <>
                A curious mind.
                <br />A place to grow.
              </>
            ) : (
              <>
                Back for
                <br />
                another round?
              </>
            )}
          </h1>
          <p>
            {path === "/signup"
              ? "Your progress. Your team. Your next good question."
              : "Sign in to pick up where you left off."}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(async () => {
              const data =
                path === "/signup"
                  ? await authClient.signUp.email({
                      name: String(f.get("name")).trim(),
                      email: String(f.get("email")).trim(),
                      password: String(f.get("password")),
                    })
                  : await authClient.signIn.email({
                      email: String(f.get("email")).trim(),
                      password: String(f.get("password")),
                    });
              if (data.error)
                throw Error(
                  data.error.message || "Could not sign in. Please try again.",
                );
              router.push("/learn");
              router.refresh();
            });
          }}
        >
          {path === "/signup" && (
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={48}
                placeholder="What should we call you?"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <span className="bz-password">
              <input
                type={passwordVisible ? "text" : "password"}
                name="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete={
                  path === "/signup" ? "new-password" : "current-password"
                }
                placeholder="At least 10 characters"
              />
              <button
                type="button"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>
          {notice && (
            <p role="alert" className="bz-error">
              {notice}
            </p>
          )}
          <button type="submit" className="bz-primary" disabled={busy}>
            {busy
              ? "One moment…"
              : path === "/signup"
                ? "Create account"
                : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="bz-auth-switch">
          {path === "/signup" ? "Already playing?" : "New here?"}{" "}
          <Link href={path === "/signup" ? "/login" : "/signup"}>
            {path === "/signup" ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <Link className="bz-text-button" href="/play">
          Explore games first
        </Link>
      </div>
    );
  const learned = progress?.catalog.reduce((n, l) => n + l.learned, 0) || 0,
    team = teams?.team,
    owner = team?.owner_id === user?.id;
  return (
    <BuzzerShell name={user?.name}>
      {notice && (
        <div className="bz-error" role="alert">
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {loading && (
        <p className="bz-loading-line" role="status">
          Refreshing your space…
        </p>
      )}
      {(path === "/" || path === "/learn" || path === "/dashboard") && (
        <>
          <p className="bz-eyebrow">
            {user
              ? `HEY, ${user.name.split(" ")[0].toUpperCase()}`
              : "FOLLOW YOUR CURIOSITY"}
          </p>
          <h1 className="bz-page-heading">
            Make room for
            <br />
            something new.
          </h1>
          <section className="bz-feature bz-dark">
            <span className="bz-feature-kicker">YOUR NEXT SESSION</span>
            <h2>
              {progress?.catalog.find((l) => l.learned < l.total)?.title ||
                "A world of museums"}
            </h2>
            <p>
              {user
                ? "A short lesson. A stronger memory."
                : "Build knowledge you can bring to the game."}
            </p>
            {primary(user ? "Start learning" : "Create your account", () =>
              needAccount(
                () =>
                  void startLesson(
                    progress?.catalog.find((l) => l.learned < l.total)?.id,
                  ),
              ),
            )}
            <Landmark className="bz-museum-art" aria-hidden="true" />
          </section>
          <button
            className="bz-review"
            onClick={() => needAccount(() => void startLesson(undefined, true))}
          >
            <RotateCcw size={23} />
            <span>
              <strong>A little review</strong>
              <small>
                {user
                  ? progress
                    ? progress.due
                      ? `${progress.due} ideas worth another look.`
                      : "You’re caught up. Nice work."
                    : "Your review is loading."
                  : "Sign in to revisit what you’ve learned."}
              </small>
            </span>
            <ArrowRight size={20} />
          </button>
          <div className="bz-section-title">
            <h2>Your topics</h2>
            {user && <span>{learned} connections recalled</span>}
          </div>
          {(
            progress?.catalog || [
              {
                id: "major-museums",
                title: "A world of museums",
                subject: "Arts",
                learned: 0,
                total: 10,
              },
              {
                id: "on-a-stamp",
                title: "People worth remembering",
                subject: "History",
                learned: 0,
                total: 10,
              },
              {
                id: "presidential-before-after",
                title: "Who came next?",
                subject: "History",
                learned: 0,
                total: 10,
              },
              {
                id: "spelling-number",
                title: "Numbers, by the letter",
                subject: "Mathematics",
                learned: 0,
                total: 10,
              },
            ]
          ).map((l) => (
            <Row
              key={l.id}
              title={l.title}
              description={
                user
                  ? `${l.learned} of ${l.total} recalled · ${l.subject}`
                  : l.subject
              }
              Icon={l.subject === "Arts" ? Landmark : BookOpen}
              onClick={() => needAccount(() => void startLesson(l.id))}
            />
          ))}
        </>
      )}
      {path === "/play" && (
        <>
          <p className="bz-eyebrow">PUT IT INTO PRACTICE</p>
          <h1 className="bz-page-heading">
            Know it.
            <br />
            Now show it.
          </h1>
          <ModeSwitch mode={mode} setMode={setMode} />
          {mode === "Practice" ? (
            <>
              <section className="bz-feature bz-lime">
                <h2>
                  Ultimate
                  <br />
                  Challenge
                </h2>
                <p className="bz-rules">10 questions · 60 seconds</p>
                <p>50 points per correct answer.</p>
                <Link className="bz-primary bz-primary-dark" href="/ultimate">
                  Pick a theme <ArrowRight size={18} />
                </Link>
                <img
                  className="bz-buzzer-art"
                  src="/buzzer-design/assets/buzzer.png"
                  alt=""
                />
              </section>
              <div className="bz-section-title">
                <h2>Find your rhythm</h2>
              </div>
              <Row
                title="Quick play"
                description="Five questions. No pressure."
                Icon={Zap}
                href="/practice?mode=quick"
              />
              <Row
                title="Choose a category"
                description="Practice what interests you."
                Icon={Grid2X2}
                href="/practice"
              />
            </>
          ) : (
            <>
              <section className="bz-feature bz-dark">
                <span className="bz-feature-kicker">BRING YOUR BEST</span>
                <h2>
                  A little friendly
                  <br />
                  competition.
                </h2>
                <p>
                  Get your team together.
                  <br />
                  See what you know under pressure.
                </p>
                <Link className="bz-primary" href="/teams">
                  Find your team <ArrowRight size={18} />
                </Link>
              </section>
              <Row
                title="Host an HCASC-style game"
                description="Three rounds. Two teams. One room."
                Icon={Timer}
                href="/rooms?host=1&mode=hcasc"
              />
            </>
          )}
          <Link className="bz-room-link" href="/rooms">
            <UsersRound size={24} />
            <span>
              <strong>Play with others</strong>
              <small>Open a room or join your friends.</small>
            </span>
            <ArrowRight size={20} />
          </Link>
        </>
      )}
      {path === "/teams" && (
        <>
          <p className="bz-eyebrow">YOUR PEOPLE</p>
          <h1 className="bz-page-heading">
            {team ? (
              team.name
            ) : (
              <>
                Good company.
                <br />
                Better questions.
              </>
            )}
          </h1>
          {!user ? (
            <section className="bz-feature bz-dark">
              <h2>Find your people.</h2>
              <p>
                Create an account to start a team or join your friends. No
                school email needed.
              </p>
              <Link href="/signup" className="bz-primary">
                Create account <ArrowRight size={18} />
              </Link>
            </section>
          ) : !team ? (
            <>
              <p className="bz-body">
                Start a team, invite your friends, and build your knowledge
                together.
              </p>
              {primary("Create a team", () => setModal("create"))}
              <Row
                title="Have an invite?"
                description="Join your friends with a team code."
                Icon={LinkIcon}
                onClick={() => setModal("join")}
              />
            </>
          ) : (
            <>
              <div className="bz-team-meta">
                <p>
                  {team.members.length}{" "}
                  {team.members.length === 1 ? "member" : "members"}
                  {team.school ? ` · ${team.school}` : " · Student team"}
                </p>
                <button
                  aria-label="Team settings"
                  onClick={() => setModal("settings")}
                >
                  <Settings2 size={18} />
                </button>
              </div>
              <div className="bz-roster">
                {team.members.slice(0, 5).map((m) => (
                  <span
                    className={`bz-member ${m.id === user.id ? "bz-you" : ""}`}
                    title={m.name}
                    key={m.id}
                  >
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                ))}
                <button onClick={() => setModal("invite")}>Invite +</button>
              </div>
              <ModeSwitch mode={mode} setMode={setMode} />
              <section className="bz-feature bz-dark">
                <h2>
                  {mode === "Practice"
                    ? "Better together."
                    : "A little friendly rivalry."}
                </h2>
                <p>
                  {mode === "Practice"
                    ? "Work through questions. Talk it out."
                    : "Invite another team. Bring your best."}
                </p>
                {mode === "Practice" ? (
                  team.room_code ? (
                    <Link
                      href={`/rooms?code=${team.room_code}`}
                      className="bz-primary"
                    >
                      Join team practice <ArrowRight size={18} />
                    </Link>
                  ) : owner ? (
                    primary("Start team practice", () => void createRoom())
                  ) : (
                    <p>Your captain can open the practice room.</p>
                  )
                ) : owner ? (
                  primary("Challenge a team", () => setModal("challenge"))
                ) : (
                  <p>Your captain can arrange the next match.</p>
                )}
                <div className="bz-overlap" aria-hidden="true" />
              </section>
              {mode === "Practice" && owner && (
                <Row
                  title="Arrange a friendly match"
                  description="Invite another team to play."
                  Icon={ArrowLeftRight}
                  onClick={() => setModal("challenge")}
                />
              )}
              <div className="bz-section-title">
                <h2>Your matches</h2>
                <span>Updates every 15 seconds</span>
              </div>
              {teams?.challenges.length ? (
                teams.challenges.map((c) => (
                  <article className="bz-match" key={c.id}>
                    <span className="bz-eyebrow">{c.status.toUpperCase()}</span>
                    <h3>
                      {c.from_name} vs {c.to_name}
                    </h3>
                    <p>
                      {new Date(c.scheduled_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {c.status === "pending" && owner && (
                      <div className="bz-inline-actions">
                        {c.to_team === team.id ? (
                          <>
                            <button
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  teamAction({
                                    action: "respond",
                                    id: c.id,
                                    status: "accepted",
                                  }),
                                )
                              }
                            >
                              Accept
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  teamAction({
                                    action: "respond",
                                    id: c.id,
                                    status: "declined",
                                  }),
                                )
                              }
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                teamAction({
                                  action: "respond",
                                  id: c.id,
                                  status: "cancelled",
                                }),
                              )
                            }
                          >
                            Cancel invitation
                          </button>
                        )}
                      </div>
                    )}
                    {c.status === "accepted" &&
                      (c.room_code ? (
                        <Link
                          href={`/rooms?code=${c.room_code}`}
                          className="bz-primary bz-primary-small"
                        >
                          Join match <ArrowRight size={16} />
                        </Link>
                      ) : c.from_team === team.id && owner ? (
                        <button
                          className="bz-primary bz-primary-small"
                          disabled={busy}
                          onClick={() => void createRoom(c.id)}
                        >
                          Open match room <ArrowRight size={16} />
                        </button>
                      ) : (
                        <p>
                          Waiting for the inviting captain to open the room.
                        </p>
                      ))}
                  </article>
                ))
              ) : (
                <p className="bz-empty">
                  No matches yet. Your next friendly rivalry starts with an
                  invitation.
                </p>
              )}
              <Row
                title={
                  team.school
                    ? "Your school affiliation"
                    : "Represent your school"
                }
                description={
                  team.school ||
                  "Add an optional school affiliation in team settings."
                }
                Icon={ShieldCheck}
                onClick={() => setModal("settings")}
              />
            </>
          )}
        </>
      )}
      {path === "/account" && (
        <>
          <p className="bz-eyebrow">YOUR LITTLE EDGE</p>
          <h1 className="bz-page-heading">
            {user ? (
              <>Hey, {user.name.split(" ")[0]}.</>
            ) : (
              <>
                Make yourself
                <br />
                at home.
              </>
            )}
          </h1>
          {user ? (
            <>
              <p className="bz-body">{user.email}</p>
              <div className="bz-stats">
                <div>
                  <strong>{progress?.total || 0}</strong>
                  <span>ideas practiced</span>
                </div>
                <div>
                  <strong>
                    {progress?.attempts
                      ? Math.round((progress.correct / progress.attempts) * 100)
                      : 0}
                    %
                  </strong>
                  <span>recall accuracy</span>
                </div>
              </div>
              <Row
                title="Edit your name"
                description="Make this space yours."
                Icon={Settings2}
                onClick={() => setModal("name")}
              />
              <Row
                title="Device game history"
                description="Your quick-play and Ultimate results."
                Icon={Timer}
                href="/profile"
              />
              <Row
                title="Sign out"
                description="Your progress will be here when you return."
                Icon={LogOut}
                onClick={() =>
                  void run(async () => {
                    await authClient.signOut();
                    router.push("/");
                  })
                }
              />
            </>
          ) : (
            <Link className="bz-primary" href="/signup">
              Create account <ArrowRight size={18} />
            </Link>
          )}
        </>
      )}
      {lesson && (
        <Dialog
          title={
            lesson.stage === "done"
              ? "A little wiser."
              : lesson.stage === "study"
                ? lesson.title
                : lesson.questions[lesson.index].text
          }
          onClose={() => setLesson(null)}
        >
          {lesson.stage === "study" ? (
            <>
              <p className="bz-body">{lesson.intro}</p>
              <div className="bz-study-list">
                {lesson.questions.map((q) => (
                  <div key={q.id}>
                    <span>{q.text}</span>
                    <strong>{q.study?.answer}</strong>
                    <a href={q.source} target="_blank" rel="noreferrer">
                      Explore source ↗
                    </a>
                  </div>
                ))}
              </div>
              {primary("Let’s try them", () =>
                setLesson({ ...lesson, stage: "quiz" }),
              )}
            </>
          ) : lesson.stage === "done" ? (
            <>
              <p className="bz-body">
                You recalled {lesson.score} of {lesson.questions.length}{" "}
                connections. A few minutes well spent.
              </p>
              <div className="bz-feedback">
                <Check size={22} />
                <p>
                  Your progress is saved. Missed ideas return sooner; confident
                  answers get more time before review.
                </p>
              </div>
              {primary("Keep exploring", () => setLesson(null))}
            </>
          ) : (
            <>
              <p className="bz-eyebrow">
                {lesson.index + 1} OF {lesson.questions.length} · {lesson.title}
              </p>
              <progress value={lesson.index} max={lesson.questions.length} />
              <div className="bz-choices">
                {lesson.questions[lesson.index].choices.map((c) => (
                  <button
                    key={c}
                    disabled={busy || !!feedback}
                    className={
                      feedback
                        ? c === feedback.answer
                          ? "correct"
                          : c === selectedAnswer
                            ? "wrong"
                            : ""
                        : ""
                    }
                    onClick={() => void answer(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {lessonSaveError && (
                <p role="alert" className="bz-error">
                  {lessonSaveError}
                </p>
              )}
              {feedback && (
                <div className="bz-answer-feedback" role="status">
                  <strong>
                    {feedback.correct
                      ? "That’s it."
                      : "A useful connection to keep."}
                  </strong>
                  <p>{feedback.explanation}</p>
                  <a href={feedback.source} target="_blank" rel="noreferrer">
                    Read more ↗
                  </a>
                  {primary(
                    lesson.index + 1 === lesson.questions.length
                      ? "Finish session"
                      : "Next question",
                    nextQuestion,
                  )}
                </div>
              )}
            </>
          )}
        </Dialog>
      )}
      {modal && (
        <Dialog
          title={
            {
              create: "Your people. Your team.",
              join: "You’re invited.",
              invite: "Good company. Better questions.",
              settings: "Make it your team.",
              challenge: "A little friendly rivalry.",
              name: "What should we call you?",
            }[modal] || "Your team"
          }
          onClose={() => setModal(null)}
        >
          {notice && (
            <p role="alert" className="bz-error">
              {notice}
            </p>
          )}
          {modal === "invite" && team && (
            <>
              <p className="bz-body">
                Share this code with friends. They can join from their Teams
                page.
              </p>
              <div className="bz-invite-code">{team.invite_code}</div>
              {primary(
                "Copy invite code",
                () =>
                  void run(async () => {
                    await navigator.clipboard.writeText(team.invite_code);
                    setNotice("Invite code copied.");
                  }),
              )}
              {owner && (
                <button
                  className="bz-text-button"
                  disabled={busy}
                  onClick={() =>
                    void run(() => teamAction({ action: "rotate" }))
                  }
                >
                  Replace invite code
                </button>
              )}
            </>
          )}
          {["create", "join", "settings", "name", "challenge"].includes(
            modal,
          ) && (
            <form
              className="bz-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(async () => {
                  if (modal === "name") {
                    const result = await authClient.updateUser({
                      name: String(f.get("name")).trim(),
                    });
                    if (result.error) throw Error(result.error.message);
                    setModal(null);
                  } else if (modal === "challenge") {
                    const d = new Date(String(f.get("scheduledAt")));
                    await teamAction({
                      action: "challenge",
                      opponent: f.get("opponent"),
                      scheduledAt: d.toISOString(),
                    });
                  } else
                    await teamAction({
                      action: modal === "settings" ? "update" : modal,
                      name: f.get("name"),
                      school: f.get("school"),
                      code: f.get("code"),
                    });
                });
              }}
            >
              {["create", "settings", "name"].includes(modal) && (
                <label>
                  {modal === "name" ? "Your name" : "Team name"}
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={48}
                    defaultValue={
                      modal === "settings"
                        ? team?.name
                        : modal === "name"
                          ? user?.name
                          : ""
                    }
                    disabled={modal === "settings" && !owner}
                    placeholder="The Quick Thinkers"
                  />
                </label>
              )}
              {modal === "settings" && (
                <>
                  <label>
                    School affiliation (optional)
                    <input
                      name="school"
                      maxLength={100}
                      defaultValue={team?.school || ""}
                      disabled={!owner}
                      placeholder="Your school or university"
                    />
                  </label>
                  <p className="bz-muted">
                    This is a self-declared affiliation. It does not imply
                    verification for official events.
                  </p>
                </>
              )}
              {modal === "join" && (
                <label>
                  Team invite code
                  <input
                    name="code"
                    minLength={12}
                    maxLength={12}
                    required
                    autoComplete="off"
                    placeholder="12-character code"
                  />
                </label>
              )}
              {modal === "challenge" && (
                <>
                  <label>
                    Other team
                    <select name="opponent" required defaultValue="">
                      <option value="" disabled>
                        Choose a team
                      </option>
                      {teams?.available.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.name} · {t.members} members
                          {t.school ? ` · ${t.school}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!teams?.available.length && (
                    <p className="bz-body">
                      No other teams yet. Invite friends to create one, then
                      arrange a match.
                    </p>
                  )}
                  <label>
                    Preferred date & time
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      required
                      min={new Date(
                        Date.now() +
                          60000 -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)}
                    />
                  </label>
                  <p className="bz-muted">
                    Your device’s local time. The other captain can accept or
                    decline.
                  </p>
                </>
              )}
              {(modal !== "settings" || owner) && (
                <button
                  className="bz-primary"
                  disabled={
                    busy || (modal === "challenge" && !teams?.available.length)
                  }
                  type="submit"
                >
                  {busy
                    ? "One moment…"
                    : modal === "join"
                      ? "Join team"
                      : modal === "challenge"
                        ? "Send invitation"
                        : modal === "create"
                          ? "Create team"
                          : "Save changes"}
                  <ArrowRight size={18} />
                </button>
              )}
            </form>
          )}
          {modal === "settings" && (
            <button
              className="bz-text-button bz-danger"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    owner
                      ? "Delete this team and its match invitations? This cannot be undone."
                      : "Leave this team?",
                  )
                )
                  void run(() =>
                    teamAction({ action: owner ? "delete" : "leave" }),
                  );
              }}
            >
              {owner ? "Delete team" : "Leave team"}
            </button>
          )}
        </Dialog>
      )}
    </BuzzerShell>
  );
}
