"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LogOut,
  Settings2,
  Timer,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { BuzzerShell, BuzzerLogo } from "./buzzer-shell";
import { ViewportForm, ViewportPages, flattenScreens } from "./viewport-pages";
import { TriviaSession, type TriviaQuestion } from "./trivia-session";
import { MasteryHome } from "./mastery-home";
import { masteryProfile, type MasteryProfile } from "@/lib/mastery";
import {
  localMasteryEvents,
  syncMastery,
  rememberMastery,
  guestProgress,
  legacyGuestRecalls,
} from "@/lib/mastery-client";
import { PlayHome } from "./play-home";
import { TeamsHome } from "./teams-home";
import { WelcomeHome } from "./welcome-home";
import { LearnJourney } from "./learn-journey";
import { saveGuestRecall, clearGuestRecalls } from "@/lib/guest-learning";

type Catalog = {
  id: string;
  title: string;
  intro: string;
  icon: string;
  subject: string;
  learned: number;
  total: number;
  questionIds?: string[];
  related?: string[];
  seen?: number;
};
type StudyQuestion = TriviaQuestion;
type Progress = {
  xp?: number;
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
  stats?: { xp: number; learned: number; active: number };
  weekly?: { answers: number; goal: number };
  members: {
    id: string;
    name: string;
    xp?: number;
    learned?: number;
    strongest?: string | null;
    focus?: string | null;
    cheers?: number;
    cheered?: boolean;
    power?: number;
  }[];
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
  savedFor?: string;
  xp?: number;
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
  screenOverlay?: boolean;
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
      {flattenScreens(children).some(
        (child) =>
          typeof child === "object" &&
          child !== null &&
          "type" in child &&
          child.type === ViewportForm,
      ) ? (
        <div className="bz-dialog-content">{children}</div>
      ) : (
        <div className="bz-dialog-content">
          <ViewportPages label="Step">{children}</ViewportPages>
        </div>
      )}
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
export default function BuzzerApp() {
  const path = usePathname(),
    router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  const trailRequest = useRef(0);
  const [progress, setProgress] = useState<Progress | null>(null),
    [teams, setTeams] = useState<Teams | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [modal, setModal] = useState<string | null>(null),
    [passwordVisible, setPasswordVisible] = useState(false);
  const [lesson, setLesson] = useState<{
    title: string;
    intro: string;
    questions: StudyQuestion[];
    review: boolean;
    trailId: string;
    token: string;
    related: { id: string; title: string }[];
  } | null>(null);
  const [mastery, setMastery] = useState<MasteryProfile | null>(null);
  const progressRequest = useRef(0);
  const loadProgress = useCallback(async () => {
    const requestId = ++progressRequest.current;
    const requestUserId = user?.id;
    const guest = guestProgress();
    if (user) {
      await syncMastery(user.id);
      const legacy = legacyGuestRecalls();
      for (let offset = 0; offset < legacy.length; offset += 5)
        await api("/api/learn", {
          action: "import",
          records: legacy.slice(offset, offset + 5),
        });
      clearGuestRecalls();
    }
    const data = await api<Progress>("/api/learn");
    if (!user && guest.length) {
      data.catalog = data.catalog.map((course) => ({
        ...course,
        seen: guest.filter((r) => course.questionIds?.includes(r.questionId))
          .length,
        learned: guest.filter(
          (r) => r.correct && course.questionIds?.includes(r.questionId),
        ).length,
      }));
      data.xp = guest.filter((r) => r.earnedAnswer || r.correct).length * 10;
      data.total = guest.length;
      data.correct = guest.filter((r) => r.correct).length;
      data.attempts = guest.length;
      data.due = guest.filter(
        (r) => !r.correct || r.at + 86400000 <= Date.now(),
      ).length;
    }
    if (user) {
      const connected = await api<MasteryProfile>("/api/mastery");
      if (
        requestId !== progressRequest.current ||
        activeUser.current !== requestUserId
      )
        return data;
      setMastery(connected);
      data.xp = connected.xp;
    } else {
      const connected = masteryProfile(localMasteryEvents());
      if (
        requestId !== progressRequest.current ||
        activeUser.current !== requestUserId
      )
        return data;
      setMastery(connected);
      data.xp = connected.xp;
    }
    setProgress(data);
    return data;
  }, [user?.id]);
  const loadTeams = useCallback(async () => {
    const data = await api<Teams>("/api/teams");
    setTeams(data);
    return data;
  }, []);
  useEffect(() => {
    if (
      !user &&
      ["/teams", "/account", "/login", "/signup", "/welcome"].includes(path)
    )
      return;
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
      setMastery(null);
      setProgress(null);
      setTeams(null);
      setLesson(null);
    }
  }, [user?.id]);
  useEffect(() => {
    setModal(null);
    trailRequest.current += 1;
    setLesson(null);
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
  async function startLesson(id?: string, review = false) {
    await run(async () => {
      const requestId = ++trailRequest.current;
      const guest = guestProgress();
      const due = guest.filter(
        (r) => !r.correct || r.at + 86400000 <= Date.now(),
      );
      const trailId = id || "trail-geography";
      try {
        localStorage.setItem("buzzer-active-trail", trailId);
      } catch {}
      const trail = progress?.catalog.find((t) => t.id === trailId);
      const local = guest
        .filter((r) => trail?.questionIds?.includes(r.questionId))
        .sort((a, b) => b.at - a.at);
      const data = await api<Progress>(
        review
          ? "/api/learn?review=1" +
              (!user
                ? "&ids=" +
                  due
                    .slice(0, 5)
                    .map((r) => r.questionId)
                    .join(",")
                : "")
          : "/api/learn?trail=" +
              encodeURIComponent(trailId) +
              (!user
                ? "&exclude=" +
                  local.map((r) => r.questionId).join(",") +
                  "&missed=" +
                  local
                    .filter((r) => !r.correct)
                    .map((r) => r.questionId)
                    .join(",")
                : ""),
      );
      if (requestId !== trailRequest.current) return;
      if (!data.questions.length) {
        setNotice(
          "You’re all caught up. Explore a new topic while your next review gets ready.",
        );
        return;
      }
      const item = data.catalog.find((l) => l.id === trailId);
      setLesson({
        title: review ? "Back in the mix" : item?.title || "Your next trail",
        trailId,
        token: crypto.randomUUID(),
        related: (item?.related || [])
          .map((id) => data.catalog.find((t) => t.id === id))
          .filter((t): t is Catalog => !!t)
          .map((t) => ({ id: t.id, title: t.title })),
        intro: item?.intro || "Bring a few ideas back to mind.",
        questions: data.questions,
        review,
      });
    });
  }
  async function answerLesson(q: StudyQuestion, value: string) {
    const attemptId = crypto.randomUUID();
    const source = lesson?.review ? "review" : "learn";
    const result = await api<Feedback>("/api/learn", {
      attemptId,
      source,
      questionId: q.id,
      answer: value,
    });
    if (!user) {
      if (
        localMasteryEvents().some(
          (r) =>
            r.questionId === q.id && r.correct && r.at > Date.now() - 86400000,
        )
      )
        result.xp = 0;
      saveGuestRecall({
        questionId: q.id,
        answer: value,
        correct: result.correct,
        at: Date.now(),
      });
    }
    rememberMastery(
      q.id,
      value,
      result.correct,
      source,
      attemptId,
      result.savedFor,
    );
    return result;
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
        mode: "hcasc",
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
  if ((path === "/" || path === "/welcome") && !user) return <WelcomeHome />;
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
        <ViewportForm
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
        </ViewportForm>
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
        <div
          className="bz-error bz-global-notice"
          role="alert"
          data-screen-overlay
        >
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {loading && (
        <p className="bz-loading-line" role="status" data-screen-overlay>
          Refreshing your space…
        </p>
      )}
      {(path === "/" || path === "/learn" || path === "/dashboard") && (
        <LearnJourney
          mastery={mastery}
          catalog={progress?.catalog || []}
          xp={progress?.xp || 0}
          due={progress?.due || 0}
          busy={busy}
          onStart={(id) => void startLesson(id)}
          onReview={() => void startLesson(undefined, true)}
        />
      )}
      {path === "/play" && <PlayHome mastery={mastery} />}
      {path === "/mastery" && (
        <MasteryHome profile={mastery} signedIn={!!user} />
      )}
      {path === "/teams" && (
        <TeamsHome
          team={team}
          user={!!user}
          userId={user?.id}
          onCheer={(userId) =>
            void run(() => teamAction({ action: "cheer", userId }))
          }
          owner={owner}
          busy={busy}
          matches={teams?.challenges || []}
          onModal={setModal}
          onPractice={() => void createRoom()}
          onOpenMatch={(id) => void createRoom(id)}
          onRespond={(id, status) =>
            void run(() => teamAction({ action: "respond", id, status }))
          }
        />
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
                  <span>questions explored</span>
                </div>
                <div>
                  <strong>
                    {progress?.attempts
                      ? Math.round((progress.correct / progress.attempts) * 100)
                      : 0}
                    %
                  </strong>
                  <span>answer accuracy</span>
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
        <TriviaSession
          key={lesson.token}
          related={lesson.related}
          loading={busy}
          continuationError={notice}
          onContinue={(id) => void startLesson(id || lesson.trailId)}
          screenOverlay
          title={lesson.title}
          questions={lesson.questions}
          review={lesson.review}
          user={!!user}
          onAnswer={answerLesson}
          onComplete={() => void loadProgress().catch(() => {})}
          onClose={() => {
            trailRequest.current += 1;
            setLesson(null);
            void loadProgress().catch(() => {});
          }}
        />
      )}
      {modal && (
        <Dialog
          screenOverlay
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
            <ViewportForm
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
              {["create", "settings"].includes(modal) && (
                <>
                  <label>
                    School affiliation (optional)
                    <input
                      name="school"
                      maxLength={100}
                      defaultValue={team?.school || ""}
                      disabled={modal === "settings" && !owner}
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
            </ViewportForm>
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
