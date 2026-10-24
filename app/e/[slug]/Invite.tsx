"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18n";
import { LangToggle, Logo, useShortCountdown } from "@/components/ui";
import ShareSheet from "@/components/ShareSheet";
import { CameraIcon, DownloadIcon, QrIcon } from "@/components/UiIcons";

type Props = {
  ev: {
    slug: string; name: string; hostName: string | null; message: string | null;
    coverUrl: string; endsAt: string; revealAt: string; shotsPerGuest: number;
  };
  photoCount: number;
  guests: number;
  full: boolean;
  open: boolean;
  revealed: boolean;
  canSee: boolean;
  hostOnly: boolean;
  preview: { id: string; thumbUrl: string; guestName: string | null }[];
  guestName: string | null;
  shotsLeft: number;
};

const fmt = (n: number, lang: string) => new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US").format(n);

export default function Invite({ ev, photoCount, guests, full, open, revealed, canSee, hostOnly, preview, guestName, shotsLeft }: Props) {
  const { t, lang } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const toEnd = useShortCountdown(ev.endsAt);
  const toReveal = useShortCountdown(ev.revealAt);
  const albumHref = `/e/${ev.slug}/album`;

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

  const mid = open
    ? { v: toEnd, l: t.guest.timeLeft }
    : !revealed
      ? { v: toReveal, l: t.guest.opensIn }
      : { v: new Date(ev.endsAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short" }), l: t.guest.closed };

  let primary: React.ReactNode;
  if (open && guestName && shotsLeft > 0) {
    primary = (
      <Link href={`/e/${ev.slug}/kamera`} className="eh-primary">
        <CameraIcon /> <span>{t.guest.openCamera}</span> <small>{shotsLeft} {t.guest.shotsLeftShort}</small>
      </Link>
    );
  } else if (open && !guestName && !full) {
    primary = (
      <button type="button" className="eh-primary" onClick={() => setJoinOpen(true)}>
        <CameraIcon /> <span>{t.guest.join}</span>
      </button>
    );
  } else if (revealed || (guestName && shotsLeft === 0)) {
    primary = (
      <Link href={albumHref} className="eh-primary">
        <span>{t.guest.toAlbum}</span> <small>{fmt(photoCount, lang)} {t.common.photos}</small>
      </Link>
    );
  } else {
    primary = (
      <span className="eh-primary is-off" aria-disabled="true">
        <span>{open && full ? t.guest.full : t.guest.developing}</span>
      </span>
    );
  }

  return (
    <div className="eh">
      <header className="eh-hero">
        <img src={ev.coverUrl} alt="" className="eh-cover" />
        <div className="eh-shade" />
        <div className="eh-top">
          <Link href="/" className="logo-link" aria-label="memoar"><Logo light /></Link>
          <LangToggle dark />
        </div>
        <div className="eh-head">
          {ev.hostName && <span className="eh-host">{t.guest.invitedBy} {ev.hostName}</span>}
          <h1>{ev.name}</h1>
          <div className="eh-stats">
            <div><b>{fmt(photoCount, lang)}</b><span>{t.guest.moments}</span></div>
            <div><b suppressHydrationWarning>{mid.v}</b><span>{mid.l}</span></div>
            <div><b>{fmt(guests, lang)}</b><span>{t.guest.people}</span></div>
          </div>
        </div>
      </header>

      <div className="eh-body">
        <div className="eh-actions">
          {primary}
          <button type="button" className="eh-sq" onClick={() => setShareOpen(true)} aria-label={t.guest.shareTitle} title={t.guest.shareTitle}>
            <QrIcon />
          </button>
          <Link href={albumHref} className="eh-sq" aria-label={t.guest.toAlbum} title={t.guest.toAlbum}>
            <DownloadIcon />
          </Link>
        </div>

        {guestName && <p className="eh-hello">👋 {guestName}</p>}
        {ev.message && <p className="eh-msg">“{ev.message}”</p>}
        {!open && !guestName && !revealed && <p className="eh-note">{t.guest.ended}</p>}

        {canSee && preview.length > 0 ? (
          <>
            <div className="eh-grid">
              {preview.map((p) => (
                <Link key={p.id} href={albumHref} className="eh-tile">
                  <img src={p.thumbUrl} alt="" loading="lazy" />
                  {p.guestName && <span>{p.guestName}</span>}
                </Link>
              ))}
            </div>
            {photoCount > preview.length && (
              <Link href={albumHref} className="btn btn-ghost btn-block" style={{ marginTop: 14 }}>
                {t.guest.seeAll} · {fmt(photoCount, lang)}
              </Link>
            )}
          </>
        ) : hostOnly && revealed ? (
          <p className="eh-note">{t.guest.hostOnly}</p>
        ) : !revealed ? (
          <>
            <p className="eh-note">{t.guest.developingGrid}</p>
            <div className="eh-grid">
              {Array.from({ length: Math.max(4, Math.min(photoCount, 6)) }, (_, i) => (
                <div key={i} className="eh-tile eh-dev" style={{ animationDelay: `${i * 0.25}s` }} />
              ))}
            </div>
          </>
        ) : (
          <p className="eh-note">{t.guest.empty}</p>
        )}
      </div>

      {joinOpen && (
        <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="join-title" onClick={(e) => e.target === e.currentTarget && !busy && setJoinOpen(false)}>
          <form className="sheet" onSubmit={join}>
            <div className="sheet-grip" />
            <div>
              <h3 id="join-title" style={{ margin: 0 }}>{t.guest.joinTitle}</h3>
              <p className="muted small" style={{ margin: "6px 0 0" }}>{t.guest.joinLead}</p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.guest.namePh}
              aria-label={t.guest.yourName}
              maxLength={40}
              autoComplete="given-name"
              autoFocus
              required
            />
            {error && <span className="err">{error}</span>}
            <button className="btn btn-accent btn-block" disabled={busy || !name.trim()}>
              {busy ? t.guest.joining : `${t.guest.join} →`}
            </button>
            <span className="hint" style={{ textAlign: "center" }}>{ev.shotsPerGuest} {t.guest.shotsLeft}</span>
          </form>
        </div>
      )}

      <ShareSheet path={`/e/${ev.slug}`} title={ev.name} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
