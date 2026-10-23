"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "./I18n";
import { downloadPhotos } from "@/lib/image-client";

export type GPhoto = {
  id: string;
  guestId: string | null;
  guestName: string | null;
  url: string;
  thumbUrl: string;
  hidden?: boolean;
  createdAt: string;
};

const COLORS = ["#e0562a", "#2e5b4e", "#7b4b94", "#c08a1e", "#2f6fa3", "#a23b5a", "#4d7a2a"];
export const colorFor = (s: string) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export function Gallery({
  slug,
  eventName,
  photos,
  admin = false,
  onHide,
  onDelete,
}: {
  slug: string;
  eventName: string;
  photos: GPhoto[];
  admin?: boolean;
  onHide?: (p: GPhoto) => void;
  onDelete?: (p: GPhoto) => void;
}) {
  const { t } = useT();
  const [who, setWho] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const people = useMemo(() => {
    const m = new Map<string, { id: string; name: string; n: number }>();
    for (const p of photos) {
      const k = p.guestId || "?";
      const cur = m.get(k) || { id: k, name: p.guestName || "—", n: 0 };
      cur.n++;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [photos]);

  const shown = useMemo(() => (who ? photos.filter((p) => (p.guestId || "?") === who) : photos), [photos, who]);

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const zipName = `memoar-${slug}.zip`;
  const download = async (list: GPhoto[]) => {
    if (!list.length) return;
    setProgress(list.length > 1 ? `${t.admin.zipping} 0/${list.length}` : t.common.loading);
    try {
      await downloadPhotos(slug, list, zipName, (d, total) => setProgress(`${t.admin.zipping} ${d}/${total}`));
    } catch {
      alert(t.common.error);
    }
    setProgress(null);
  };

  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : Math.min(shown.length - 1, o + 1)));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : Math.max(0, o - 1)));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, shown.length, close]);

  if (!photos.length) return <p className="muted">{admin ? t.admin.noPhotos : t.guest.empty}</p>;

  const cur = open !== null ? shown[open] : null;

  return (
    <div>
      {people.length > 1 && (
        <div className="chips">
          <button className={`chip ${!who ? "on" : ""}`} onClick={() => setWho(null)}>
            {t.guest.everyone} · {photos.length}
          </button>
          {people.map((p) => (
            <button key={p.id} className={`chip ${who === p.id ? "on" : ""}`} onClick={() => setWho(p.id)}>
              {p.name} · {p.n}
            </button>
          ))}
        </div>
      )}
      <div className="toolbar">
        <span className="small muted">
          {shown.length} {t.common.photos}
          {progress && <> · <b>{progress}</b></>}
        </span>
        <div className="row">
          {selecting ? (
            <>
              <button className="btn btn-ghost btn-small" onClick={() => setSel(new Set(shown.map((p) => p.id)))}>{t.guest.selectAll}</button>
              <button className="btn btn-small btn-accent" disabled={!sel.size || !!progress} onClick={() => download(shown.filter((p) => sel.has(p.id)))}>
                {t.guest.downloadSelected} ({sel.size})
              </button>
              <button className="btn btn-ghost btn-small" onClick={() => { setSelecting(false); setSel(new Set()); }}>{t.common.cancel}</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-small" onClick={() => setSelecting(true)}>{t.guest.select}</button>
              <button className="btn btn-small" disabled={!!progress} onClick={() => download(shown.filter((p) => !p.hidden))}>
                {t.admin.zip}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="gallery">
        {shown.map((p, i) => (
          <button
            key={p.id}
            className={`tile ${p.hidden ? "is-hidden" : ""} ${sel.has(p.id) ? "sel" : ""}`}
            onClick={() => (selecting ? toggle(p.id) : setOpen(i))}
          >
            <img src={p.thumbUrl} alt="" loading="lazy" />
            {p.hidden && <span className="flag">{t.admin.hidden}</span>}
            {!who && <span className="who">{p.guestName}</span>}
            {selecting && <span className="check">{sel.has(p.id) ? "✓" : ""}</span>}
          </button>
        ))}
      </div>

      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={eventName}>
          <div className="lb-top">
            <span className="small">{open! + 1} / {shown.length}</span>
            <div className="row">
              {admin && onHide && (
                <button className="btn btn-small btn-light" onClick={() => onHide(cur)}>
                  {cur.hidden ? t.admin.unhide : t.admin.hide}
                </button>
              )}
              {admin && onDelete && (
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => {
                    if (confirm(t.admin.deleteConfirm)) {
                      onDelete(cur);
                      if (shown.length <= 1) close();
                      else setOpen(Math.min(open!, shown.length - 2));
                    }
                  }}
                >
                  {t.common.delete}
                </button>
              )}
              <button className="icon-btn" onClick={close} aria-label={t.common.close}>✕</button>
            </div>
          </div>
          <div className="lb-img" onClick={(e) => e.target === e.currentTarget && close()}>
            <img src={cur.url} alt="" />
            {open! > 0 && <button className="lb-nav lb-prev" onClick={() => setOpen(open! - 1)} aria-label="prev">‹</button>}
            {open! < shown.length - 1 && <button className="lb-nav lb-next" onClick={() => setOpen(open! + 1)} aria-label="next">›</button>}
          </div>
          <div className="lb-bottom">
            <span>
              {t.guest.by} <b style={{ color: "#fff" }}>{cur.guestName}</b>
            </span>
            <button className="btn btn-small btn-light" onClick={() => download([cur])}>
              {t.common.download}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
