"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import PackagePicker from "@/components/PackagePicker";
import type { EventPackage } from "@/lib/packages";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18n";
import { CopyField, Countdown, LocalTime } from "@/components/ui";
import { QRImage, useQrDataUrl } from "@/components/QR";
import { Gallery, colorFor, type GPhoto } from "@/components/Gallery";
import { LOOKS } from "@/lib/filters";
import LookThumb from "@/components/LookThumb";
import { expiresAt } from "@/lib/retention";
import { prepareCover, saveBlob } from "@/lib/image-client";
import Paywall, { LockIcon, rupiah, type PayCfg } from "@/components/Paywall";
import ManualQris from "@/components/ManualQris";

type Ev = {
  id: string; slug: string; name: string; kind: string; hostName: string | null; message: string | null;
  startsAt: string; endsAt: string; revealMode: string; revealDelayHours: number; revealAt: string;
  filter: string; dateStamp: boolean; shotsPerGuest: number; maxGuests: number; visibility: string;
  allowUploads: boolean; guestLooks: boolean; packageId: string; packagePrice: number; coverUrl: string | null; downloadsUnlocked: boolean; freeFirst: boolean;
};
type Guest = { id: string; name: string; createdAt: string; shots: number };

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function Dashboard({
  ev, photos: initialPhotos, guests, isNew, guestUrl, adminUrl, maxGuestsLimit, packages, pay, initialOrder, free,
}: {
  ev: Ev; photos: GPhoto[]; guests: Guest[]; isNew: boolean; guestUrl: string; adminUrl: string; maxGuestsLimit: number; packages: EventPackage[];
  pay: PayCfg; initialOrder: string | null;
  free: { left: number; used: string[] };
}) {
  const { t, lang } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<"album" | "share" | "guests" | "settings">(isNew ? "share" : "album");
  const [photos, setPhotos] = useState(initialPhotos);
  const [unlocked, setUnlocked] = useState(ev.downloadsUnlocked);
  const [manualOpen, setManualOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const openSheet = (left?: number) => {
    setNote(left === undefined ? null : left > 0 ? t.pay.freeTooMany.replaceAll("{n}", String(left)) : pay.freeDownloads > 0 ? t.pay.freeUsedUp.replace("{n}", String(pay.freeDownloads)) : null);
    setSheet(true);
  };
  useEffect(() => setUnlocked(ev.downloadsUnlocked), [ev.downloadsUnlocked]);
  useEffect(() => setPhotos(initialPhotos), [initialPhotos]);

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [ev.revealAt, ev.startsAt, ev.endsAt]);

  // Refresh periodically so new photos and guests show up during the event.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(id);
  }, [router]);

  const started = now !== null && now >= new Date(ev.startsAt).getTime();
  const ended = now !== null && now >= new Date(ev.endsAt).getTime();
  const revealed = now !== null && now >= new Date(ev.revealAt).getTime();
  const status = ended ? t.admin.statusEnded : started ? t.admin.statusLive : t.admin.statusUpcoming;

  const api = (path: string, init: RequestInit) =>
    fetch(`/api/e/${ev.slug}/admin${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers || {}) } });

  const revealNow = async () => {
    if (!confirm(t.admin.revealConfirm)) return;
    await api("", { method: "PATCH", body: JSON.stringify({ action: "reveal_now" }) });
    router.refresh();
  };

  const onHide = async (p: GPhoto) => {
    setPhotos((ps) => ps.map((x) => (x.id === p.id ? { ...x, hidden: !p.hidden } : x)));
    await api(`/photos/${p.id}`, { method: "PATCH", body: JSON.stringify({ hidden: !p.hidden }) });
  };
  const onDelete = async (p: GPhoto) => {
    setPhotos((ps) => ps.filter((x) => x.id !== p.id));
    await api(`/photos/${p.id}`, { method: "DELETE" });
    router.refresh();
  };

  const visible = photos.filter((p) => !p.hidden).length;

  return (
    <div className="dash">
      <div className="wrap">
        {isNew && (
          <div className="new-banner">
            <h2>🎞️ {t.admin.newTitle}</h2>
            <p>{t.admin.newLead}</p>
            <div className="stack">
              <CopyField label={t.admin.adminLink} value={adminUrl} secret />
              <CopyField label={t.admin.guestLink} value={guestUrl} />
            </div>
          </div>
        )}

        <div className="dash-head">
          <div>
            <div className="row" style={{ marginBottom: 10 }}>
              <span className={`badge ${started && !ended ? "live" : ""}`}>{status}</span>
              <span className="badge">{t.kinds[ev.kind]}</span>
            </div>
            <h1>{ev.name}</h1>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              <LocalTime iso={ev.startsAt} /> — <LocalTime iso={ev.endsAt} mode="time" />
            </p>
          </div>
          <div className="row">
            <Link className="btn btn-ghost btn-small" href={`/e/${ev.slug}`} target="_blank">{t.admin.openGuest} ↗</Link>
            {!revealed && <button className="btn btn-accent btn-small" onClick={revealNow}>{t.admin.revealNow}</button>}
          </div>
        </div>

        <div className="stats">
          <div className="card stat">
            <div className="k">{t.common.photos}</div>
            <div className="v">{visible}</div>
          </div>
          <div className="card stat">
            <div className="k">{t.common.guests}</div>
            <div className="v">{guests.length} <small>/ {ev.maxGuests}</small></div>
          </div>
          <div className="card stat">
            <div className="k">{revealed ? t.admin.expiresOn : t.admin.revealAt}</div>
            <div className="v text">
              {revealed ? <LocalTime iso={expiresAt(ev)} mode="date" /> : <Countdown iso={ev.revealAt} onDone={() => router.refresh()} />}
            </div>
          </div>
        </div>
        <p className="hint" style={{ margin: "-6px 0 18px" }}>⏳ {t.admin.expiresNote}</p>

        <div className="tabs" role="tablist">
          {(["album", "share", "guests", "settings"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {t.admin.tabs[k]}
              {k === "album" && ` · ${photos.length}`}
              {k === "guests" && ` · ${guests.length}`}
            </button>
          ))}
        </div>

        {tab === "album" && (
          <>
            {pay.enabled && (
              unlocked ? (
                <div className="unlock-done">{ev.freeFirst ? `★ ${t.pay.freeFirst}` : `✓ ${t.pay.unlockedAll}`}</div>
              ) : (
                <div className="card unlock-card">
                  <span className="pw-lock"><LockIcon size={18} /></span>
                  <div className="uc-text">
                    <b>{t.pay.eventTitle}</b>
                    <span>{t.pay.lockedBanner}</span>
                  </div>
                  <button className="btn btn-accent btn-small" onClick={() => openSheet()}>
                    {t.pay.eventBtn} · {rupiah(pay.priceEvent)}
                  </button>
                  {pay.manual && (
                    <button type="button" className="uc-manual" onClick={() => setManualOpen(true)}>
                      {t.pay.manualOr}: {t.pay.manualBtn} →
                    </button>
                  )}
                </div>
              )
            )}
            <Gallery
              slug={ev.slug}
              eventName={ev.name}
              photos={photos}
              admin
              onHide={onHide}
              onDelete={onDelete}
              locked={pay.enabled && !unlocked}
              onLocked={openSheet}
              freeLeft={free.left}
              freeIds={free.used}
            />
          </>
        )}
        {pay.enabled && (
          <Paywall
            slug={ev.slug}
            admin
            cfg={pay}
            open={sheet}
            note={note}
            initialOrder={initialOrder}
            onManual={() => { setSheet(false); setManualOpen(true); }}
            onClose={() => setSheet(false)}
            onUnlocked={() => { setUnlocked(true); setSheet(false); router.replace(`/kelola/${ev.slug}`); router.refresh(); }}
          />
        )}
        {pay.manual && (
          <ManualQris
            slug={ev.slug}
            open={manualOpen}
            onClose={() => setManualOpen(false)}
            onUnlocked={() => { setUnlocked(true); setManualOpen(false); router.refresh(); }}
          />
        )}
        {tab === "share" && <Share ev={ev} guestUrl={guestUrl} adminUrl={adminUrl} />}
        {tab === "guests" && (
          <div className="card pad">
            {guests.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>{t.admin.noGuests}</p>
            ) : (
              <div className="list">
                {guests.map((g) => (
                  <div key={g.id} className="list-item">
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <span className="avatar" style={{ background: colorFor(g.name) }}>{g.name.slice(0, 1).toUpperCase()}</span>
                      <div>
                        <b>{g.name}</b>
                        <div className="small muted">{t.admin.joined} <LocalTime iso={g.createdAt} /></div>
                      </div>
                    </div>
                    <span className="mono small">{g.shots}/{ev.shotsPerGuest} {t.admin.shotsUsed}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "settings" && <Settings ev={ev} packages={packages} lang={lang} />}
      </div>
    </div>
  );
}

function Share({ ev, guestUrl, adminUrl }: { ev: Ev; guestUrl: string; adminUrl: string }) {
  const { t } = useT();
  const qr = useQrDataUrl(guestUrl, 1200);
  const downloadQr = async () => {
    if (!qr) return;
    const blob = await (await fetch(qr)).blob();
    await saveBlob(blob, `memoar-qr-${ev.slug}.png`);
  };
  return (
    <div className="share-grid">
      <div className="qr-box">
        <span className="label">{t.admin.qr}</span>
        <QRImage value={guestUrl} alt={t.admin.qr} />
        <span className="mono small muted">/e/{ev.slug}</span>
        <button className="btn btn-small btn-block" onClick={downloadQr}>{t.admin.downloadQr}</button>
        <button className="btn btn-small btn-ghost btn-block" onClick={() => window.print()}>{t.admin.printCard}</button>
      </div>
      <div className="card pad stack">
        <CopyField label={t.admin.guestLink} value={guestUrl} />
        <CopyField label={t.admin.adminLink} value={adminUrl} secret />
        <p className="hint" style={{ margin: 0 }}>{t.how.faq[1].a}</p>
      </div>
      <div className="print-card" aria-hidden="true">
        <div className="pc-inner">
          <strong style={{ fontFamily: "var(--display)", fontSize: 22 }}>memoar</strong>
          <h2>{ev.name}</h2>
          {qr && <img src={qr} alt="" />}
          <p style={{ margin: 0 }}>{t.how.acts[1].steps[0].d}</p>
          <p className="mono" style={{ margin: 0, fontSize: 12 }}>{guestUrl.replace(/^https?:\/\//, "")}</p>
        </div>
      </div>
    </div>
  );
}

function Settings({ ev, packages, lang }: { ev: Ev; packages: EventPackage[]; lang: "id" | "en" }) {
  const { t } = useT();
  const router = useRouter();
  const [f, setF] = useState({
    name: ev.name,
    hostName: ev.hostName || "",
    message: ev.message || "",
    startsAt: "",
    endsAt: "",
    revealMode: ev.revealMode,
    revealDelayHours: ev.revealDelayHours || 12,
    filter: ev.filter,
    dateStamp: ev.dateStamp,
    shotsPerGuest: ev.shotsPerGuest,
    package: ev.packageId,
    visibility: ev.visibility,
    allowUploads: ev.allowUploads,
    guestLooks: ev.guestLooks,
  });
  useEffect(() => setF((p) => ({ ...p, startsAt: toLocalInput(ev.startsAt), endsAt: toLocalInput(ev.endsAt) })), [ev.startsAt, ev.endsAt]);
  const up = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (new Date(f.endsAt) <= new Date(f.startsAt)) return setErr(t.create.errEndBeforeStart);
    setState("saving");
    const r = await fetch(`/api/e/${ev.slug}/admin`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString() }),
    });
    setState(r.ok ? "saved" : "error");
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      if (j.error === "package_too_small") setErr(t.create.errPackage);
    }
    if (r.ok) {
      router.refresh();
      setTimeout(() => setState("idle"), 1800);
    }
  };

  const changeCover = async (file?: File) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("cover", await prepareCover(file), "cover.jpg");
    await fetch(`/api/e/${ev.slug}/admin/cover`, { method: "POST", body: fd });
    router.refresh();
  };

  const deleteEvent = async () => {
    const typed = prompt(`${t.admin.deleteEventConfirm} ${ev.slug}`);
    if (typed !== ev.slug) return;
    const r = await fetch(`/api/e/${ev.slug}/admin`, { method: "DELETE" });
    if (r.ok) router.push("/");
  };

  const reveals = [
    { id: "live", l: t.create.revealLive },
    { id: "end", l: t.create.revealEnd },
    { id: "delayed", l: t.create.revealDelayed },
  ];

  return (
    <div className="stack">
      <div className="card pad">
        <label className="field">
          <span className="label">{t.create.name}</span>
          <input type="text" value={f.name} maxLength={80} onChange={(e) => up("name", e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            <span className="label">{t.create.host}</span>
            <input type="text" value={f.hostName} maxLength={80} onChange={(e) => up("hostName", e.target.value)} />
          </label>
          <div className="field">
            <span className="label">{t.create.cover}</span>
            <div className="cover-pick">
              <div className="thumb" style={ev.coverUrl ? { backgroundImage: `url(${ev.coverUrl})` } : undefined} />
              <label className="btn btn-ghost btn-small">
                {ev.coverUrl ? t.create.coverChange : t.create.coverPick}
                <input type="file" accept="image/*" hidden onChange={(e) => changeCover(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </div>
        <label className="field">
          <span className="label">{t.create.message}</span>
          <textarea value={f.message} maxLength={240} onChange={(e) => up("message", e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            <span className="label">{t.create.start}</span>
            <input type="datetime-local" value={f.startsAt} onChange={(e) => up("startsAt", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">{t.create.end}</span>
            <input type="datetime-local" value={f.endsAt} onChange={(e) => up("endsAt", e.target.value)} />
          </label>
        </div>
        <div className="field">
          <span className="label">{t.create.reveal}</span>
          <div className="choice-grid">
            {reveals.map((r) => (
              <button type="button" key={r.id} className={`choice ${f.revealMode === r.id ? "on" : ""}`} onClick={() => up("revealMode", r.id)}>
                <b>{r.l}</b>
              </button>
            ))}
          </div>
        </div>
        {f.revealMode === "delayed" && (
          <label className="field">
            <span className="label">{t.create.delayHours}</span>
            <input type="number" min={1} max={72} value={f.revealDelayHours} onChange={(e) => up("revealDelayHours", Number(e.target.value))} />
          </label>
        )}
        <div className="field">
          <span className="label">{t.create.look}</span>
          <div className="choice-grid look-grid">
            {LOOKS.map((l) => (
              <button type="button" key={l.id} className={`choice ${f.filter === l.id ? "on" : ""}`} onClick={() => up("filter", l.id)}>
                <LookThumb look={l} />
                <b>{l.name[lang]}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">{t.create.package}</span>
          <PackagePicker packages={packages} value={f.package} onChange={(id) => up("package", id)} />
          <span className="hint">{t.create.packageD}</span>
        </div>
        <label className="field">
          <span className="label">{t.create.shots}</span>
          <input type="number" min={5} max={50} value={f.shotsPerGuest} onChange={(e) => up("shotsPerGuest", Number(e.target.value))} />
        </label>
        <div className="field">
          <span className="label">{t.create.visibility}</span>
          <div className="choice-grid">
            {[{ id: "everyone", l: t.create.visEveryone }, { id: "host", l: t.create.visHost }].map((v) => (
              <button type="button" key={v.id} className={`choice ${f.visibility === v.id ? "on" : ""}`} onClick={() => up("visibility", v.id)}>
                <b>{v.l}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="stack" style={{ marginBottom: 20 }}>
          <label className="toggle">
            <span className="t-text"><b>{t.create.guestLooks}</b><span>{t.create.guestLooksD}</span></span>
            <input type="checkbox" checked={f.guestLooks} onChange={(e) => up("guestLooks", e.target.checked)} />
          </label>
          <label className="toggle">
            <span className="t-text"><b>{t.create.stamp}</b><span>{t.create.stampD}</span></span>
            <input type="checkbox" checked={f.dateStamp} onChange={(e) => up("dateStamp", e.target.checked)} />
          </label>
          <label className="toggle">
            <span className="t-text"><b>{t.create.uploads}</b><span>{t.create.uploadsD}</span></span>
            <input type="checkbox" checked={f.allowUploads} onChange={(e) => up("allowUploads", e.target.checked)} />
          </label>
        </div>
        {err && <p className="err">{err}</p>}
        <div className="row">
          <button className="btn" onClick={save} disabled={state === "saving"}>
            {state === "saving" ? t.common.loading : state === "saved" ? `✓ ${t.common.saved}` : t.common.save}
          </button>
          {state === "error" && <span className="err">{t.common.error}</span>}
        </div>
      </div>

      <div className="card pad danger-zone">
        <h3>{t.admin.dangerTitle}</h3>
        <p className="muted small">{t.admin.dangerD}</p>
        <button className="btn btn-danger btn-small" onClick={deleteEvent}>{t.admin.deleteEvent}</button>
      </div>
    </div>
  );
}
