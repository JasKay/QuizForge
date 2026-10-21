"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
export function ProfilePanel({
  profileName,
  total,
  correct,
  streak,
  review,
  onSave,
}: {
  profileName: string;
  total: number;
  correct: number;
  streak: number;
  review: number;
  onSave: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(profileName),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false),
    [ultimate, setUltimate] = useState(0);
  useEffect(() => setName(profileName), [profileName]);
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("qf-ultimate-history") || "[]");
      setUltimate(Math.max(0, ...h.map((x: { score: number }) => x.score)));
    } catch {}
  }, []);
  return (
    <section className="profile-page">
      <div className="page-title">
        <p className="overline">YOU</p>
        <h1>My Profile</h1>
      </div>
      <div className="profile-name-row">
        <span>{profileName || "Your profile"}</span>
        <button
          onClick={() => {
            setEditing(!editing);
            setMessage("");
          }}
        >
          {editing ? "Cancel" : "Edit name"}
        </button>
      </div>
      {editing && (
        <form
          className="profile-edit"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onSave(name.trim());
              setEditing(false);
              setMessage("Saved");
            } catch {
              setMessage("Could not save. Try again.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoComplete="nickname"
            />
          </label>
          <button className="trivia-primary" disabled={saving}>
            Save
            <Check size={16} />
          </button>
        </form>
      )}
      <div className="profile-stats">
        <div>
          <strong>{total}</strong>
          <span>Played</span>
        </div>
        <div>
          <strong>{total ? Math.round((correct / total) * 100) : 0}%</strong>
          <span>Accuracy</span>
        </div>
        <div>
          <strong>{streak}</strong>
          <span>Day streak</span>
        </div>
        <div>
          <strong>{ultimate}</strong>
          <span>Best Ultimate</span>
        </div>
      </div>
      <Link href="/review" className="profile-review">
        <div>
          <strong>Review missed answers</strong>
          <span>{review} to revisit</span>
        </div>
        <ArrowRight size={20} />
      </Link>
      {message && <p role="status">{message}</p>}
      <p className="profile-storage">Progress saved on this device.</p>
    </section>
  );
}
