"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18n";
import { LocalTime, useCountdown } from "@/components/ui";

type Props = {
  ev: {
    slug: string; name: string; kind: string; hostName: string | null; message: string | null;
    coverUrl: string | null; startsAt: string; endsAt: string; shotsPerGuest: number;
  };
  photos: number;
  guests: number;
  full: boolean;
  open: boolean;
  revealed: boolean;
  guestName: string | null;
};

function TimeLeft({ iso }: { iso: string }) {
  const { t } = useT();
  const ms = useCountdown(iso);
  if (ms === null || ms <= 0) return null;
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return <span>⏳ {h > 0 ? `${h}${t.time.h} ` : ""}{m}{t.time.m} {t.guest.left}</span>;
}

export default function Invite({ ev, photos, guests, full, open, revealed, guestName }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/e/${ev.slug}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error === "full" ? t.guest.full : j.error === "ended" ? t.guest.ended : t.common.error);
      setBusy(false);
      return;
    }
    router.push(`/e/${ev.slug}/kamera`);
  };

  return (
    <div className="invite">
      <div className="invite-card">
        <div className="invite-cover" style={ev.coverUrl ? { backgroundImage: `url(${ev.coverUrl})` } : undefined}>
          <div className="ic-text">
            {ev.hostName && <small>{t.guest.invitedBy} {ev.hostName}</small>}
            <h1>{ev.name}</h1>
            <span style={{ opacity: 0.8, fontSize: 14 }}><LocalTime iso={ev.startsAt} mode="date" /></span>
          </div>
        </div>
        <div className="invite-body">
          <div className="meta">
            <span>{t.kinds[ev.kind]}</span>
            <span>📷 {photos} {t.common.photos}</span>
            <span>👥 {guests} {t.common.guests}</span>
            {open && <TimeLeft iso={ev.endsAt} />}
          </div>
          {ev.message && <p className="msg">“{ev.message}”</p>}

          {guestName ? (
            <div className="stack">
              <p style={{ margin: 0 }}>👋 <b>{guestName}</b></p>
              {open && (
                <Link href={`/e/${ev.slug}/kamera`} className="btn btn-accent btn-block">{t.guest.join} →</Link>
              )}
              <Link href={`/e/${ev.slug}/album`} className="btn btn-light btn-block">{t.guest.toAlbum}</Link>
            </div>
          ) : !open ? (
            <div className="stack">
              <p style={{ margin: 0, opacity: 0.8 }}>{t.guest.ended}</p>
              {revealed && <Link href={`/e/${ev.slug}/album`} className="btn btn-light btn-block">{t.guest.toAlbum}</Link>}
            </div>
          ) : full ? (
            <p style={{ margin: 0, opacity: 0.8 }}>{t.guest.full}</p>
          ) : (
            <form onSubmit={join} className="stack">
              <label className="field" style={{ margin: 0 }}>
                <span className="label">{t.guest.yourName}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.guest.namePh}
                  maxLength={40}
                  autoComplete="given-name"
                  required
                />
              </label>
              {error && <span className="err">{error}</span>}
              <button className="btn btn-accent btn-block" disabled={busy || !name.trim()}>
                {busy ? t.guest.joining : `${t.guest.join} →`}
              </button>
              <span className="hint" style={{ textAlign: "center" }}>
                {ev.shotsPerGuest} {t.guest.shotsLeft}
              </span>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
