"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Flag,
  Link2,
  Plus,
  Settings2,
  Shield,
  UsersRound,
  X,
} from "lucide-react";
import { ViewportPages } from "./viewport-pages";
type Team = {
  id: string;
  name: string;
  school: string | null;
  owner_id: string;
  room_code: string | null;
  members: { id: string; name: string; xp?: number; learned?: number }[];
  stats?: { xp: number; learned: number; active: number };
};
type Match = {
  id: string;
  from_team: string;
  to_team: string;
  from_name: string;
  to_name: string;
  scheduled_at: string;
  status: string;
  room_code: string | null;
};
export function TeamsHome({
  team,
  user,
  owner,
  busy,
  matches,
  onModal,
  onPractice,
  onOpenMatch,
  onRespond,
}: {
  team: Team | null | undefined;
  user: boolean;
  owner: boolean;
  busy: boolean;
  matches: Match[];
  onModal: (name: string) => void;
  onPractice: () => void;
  onOpenMatch: (id: string) => void;
  onRespond: (id: string, status: string) => void;
}) {
  const [view, setView] = useState("Overview");
  if (!team)
    return (
      <section className="tr-home tr-teams-empty">
        <div className="tr-page-title">
          <div>
            <p className="tr-kicker">GOOD COMPANY. GREAT ANSWERS.</p>
            <h1>Find your people.</h1>
          </div>
        </div>
        <div className="tr-team-invitation">
          <div className="tr-team-orbit" aria-hidden="true">
            <i />
            <i />
            <span>
              <UsersRound size={47} strokeWidth={1.1} />
            </span>
            <b>
              <Plus size={19} />
            </b>
          </div>
          <span className="tr-team-invitation-tag">THE KNOWLEDGE ADDS UP</span>
          <h2>
            Better brains.
            <br />
            Together.
          </h2>
          <p>
            Build a team, share your progress, and bring what you know to the
            next game.
          </p>
          <div className="tr-team-perks">
            <span>
              <Shield size={16} />
              Your own team
            </span>
            <span>
              <Flag size={16} />
              Shared progress
            </span>
          </div>
        </div>
        <div className="tr-team-empty-actions">
          {user ? (
            <>
              <button
                className="tr-button tr-button-ink"
                onClick={() => onModal("create")}
              >
                Create a team
                <Plus size={18} />
              </button>
              <button
                className="tr-text-button"
                onClick={() => onModal("join")}
              >
                Have an invite? Join your friends
                <Link2 size={16} />
              </button>
            </>
          ) : (
            <>
              <Link className="tr-button tr-button-ink" href="/signup">
                Create an account
                <ArrowRight size={18} />
              </Link>
              <p>
                Already part of a team? <Link href="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </section>
    );
  const stats = team.stats || { xp: 0, learned: 0, active: 0 };
  return (
    <section className="tr-home tr-teams" aria-label="Your team">
      <div className="tr-page-title">
        <div>
          <p className="tr-kicker">YOUR COLLECTIVE EDGE</p>
          <h1>{team.name}</h1>
        </div>
        {owner && (
          <button
            className="tr-team-settings"
            aria-label="Team settings"
            onClick={() => onModal("settings")}
          >
            <Settings2 size={19} />
          </button>
        )}
      </div>
      <div className="tr-team-subtitle">
        <span>{team.school || "Independent team"}</span>
        <span>
          {team.members.length}{" "}
          {team.members.length === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="tr-team-tabs" role="tablist" aria-label="Team views">
        {["Overview", "People", "Matches"].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={view === tab}
            onClick={() => setView(tab)}
          >
            {tab}
            {tab === "Matches" && matches.length > 0 && <i>{matches.length}</i>}
          </button>
        ))}
      </div>
      {view === "Overview" ? (
        <>
          <div className="tr-team-scorecard">
            <div className="tr-team-score-top">
              <span className="tr-kicker">OUR KNOWLEDGE BANK</span>
              <Shield size={23} />
            </div>
            <div className="tr-team-total">
              <strong>{stats.xp.toLocaleString()}</strong>
              <span>TEAM XP</span>
            </div>
            <div className="tr-team-score-line">
              <i style={{ width: `${Math.min(100, (stats.xp % 500) / 5)}%` }} />
            </div>
            <div className="tr-team-stat-pair">
              <span>
                <strong>{stats.learned}</strong>facts banked
              </span>
              <span>
                <strong>
                  {stats.active}/{team.members.length}
                </strong>
                active this week
              </span>
            </div>
          </div>
          <div className="tr-team-people-preview">
            <div>
              <h2>Every mind counts.</h2>
              <p>Your individual discoveries build the team.</p>
            </div>
            <button
              aria-label="View team members"
              onClick={() => setView("People")}
            >
              <span>
                {team.members.slice(0, 3).map((m) => (
                  <i key={m.id}>
                    {m.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </i>
                ))}
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="tr-team-actions">
            {team.room_code ? (
              <Link
                className="tr-button tr-button-ink"
                href={`/rooms?code=${team.room_code}`}
              >
                Join team practice
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                className="tr-button tr-button-ink"
                disabled={busy || !owner}
                onClick={onPractice}
              >
                {owner
                  ? "Practice together"
                  : "Your captain can start practice"}
                <ArrowRight size={18} />
              </button>
            )}
            <div>
              <button onClick={() => onModal("invite")}>
                <Link2 size={16} />
                Invite friends
              </button>
              {owner && (
                <button onClick={() => onModal("challenge")}>
                  <Flag size={16} />
                  Arrange a match
                </button>
              )}
            </div>
          </div>
        </>
      ) : view === "People" ? (
        <div className="tr-team-list">
          <div className="tr-section-heading">
            <h2>The people behind the points</h2>
            <button onClick={() => onModal("invite")}>
              Invite
              <Plus size={14} />
            </button>
          </div>
          <ViewportPages label="People">
            {team.members.map((m) => (
              <div className="tr-person" key={m.id}>
                <span className="tr-person-avatar">
                  {m.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  <strong>{m.name}</strong>
                  <small>
                    {m.id === team.owner_id ? "Captain" : "Teammate"} /{" "}
                    {m.learned || 0} facts banked
                  </small>
                </span>
                <b>
                  {m.xp || 0}
                  <small>XP</small>
                </b>
              </div>
            ))}
          </ViewportPages>
        </div>
      ) : (
        <div className="tr-team-list">
          <div className="tr-section-heading">
            <h2>Your matchups</h2>
            {owner && (
              <button onClick={() => onModal("challenge")}>
                Arrange
                <Plus size={14} />
              </button>
            )}
          </div>
          {matches.length ? (
            <ViewportPages label="Matches">
              {matches.map((m) => (
                <article className="tr-team-match" key={m.id}>
                  <p className="tr-kicker">{m.status}</p>
                  <h2>{m.from_team === team.id ? m.to_name : m.from_name}</h2>
                  <p>
                    {new Date(m.scheduled_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {m.status === "pending" && owner && (
                    <div className="tr-match-responses">
                      {m.to_team === team.id ? (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => onRespond(m.id, "accepted")}
                          >
                            <Check size={16} />
                            Accept
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => onRespond(m.id, "declined")}
                          >
                            <X size={16} />
                            Decline
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => onRespond(m.id, "cancelled")}
                        >
                          Cancel invitation
                        </button>
                      )}
                    </div>
                  )}
                  {m.status === "accepted" &&
                    (m.room_code ? (
                      <Link
                        className="tr-button tr-button-ink"
                        href={`/rooms?code=${m.room_code}`}
                      >
                        Join match
                        <ArrowUpRight size={17} />
                      </Link>
                    ) : m.from_team === team.id && owner ? (
                      <button
                        className="tr-button tr-button-ink"
                        disabled={busy}
                        onClick={() => onOpenMatch(m.id)}
                      >
                        Open match room
                        <ArrowUpRight size={17} />
                      </button>
                    ) : (
                      <p>Your opponents' captain will open the room.</p>
                    ))}
                </article>
              ))}
            </ViewportPages>
          ) : (
            <div className="tr-empty-matches">
              <Flag size={35} strokeWidth={1.2} />
              <h2>A little friendly rivalry?</h2>
              <p>Your match invitations and upcoming games will appear here.</p>
              {owner && (
                <button
                  className="tr-button tr-button-ink"
                  onClick={() => onModal("challenge")}
                >
                  Invite another team
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
