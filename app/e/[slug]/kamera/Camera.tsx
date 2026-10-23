"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18n";
import { getLook } from "@/lib/filters";
import { developFrame, loadImageFile, type Processed } from "@/lib/image-client";

type Props = {
  slug: string;
  eventName: string;
  guestName: string;
  look: string;
  stamp: boolean;
  total: number;
  used: number;
  allowUploads: boolean;
};

type Job = { shot: Processed; source: "camera" | "upload" };

export default function Camera({ slug, eventName, look, stamp, total, used, allowUploads }: Props) {
  const { t, lang } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [camState, setCamState] = useState<"starting" | "on" | "denied" | "none">("starting");
  const [left, setLeft] = useState(Math.max(0, total - used));
  const [flash, setFlash] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const queue = useRef<Job[]>([]);
  const working = useRef(false);
  const lk = getLook(look);

  const showToast = useCallback((msg: string, ms = 1600) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), ms);
  }, []);

  const stop = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  const start = useCallback(async (mode: "environment" | "user") => {
    stop();
    if (!navigator.mediaDevices?.getUserMedia) return setCamState("none");
    setCamState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: mode }, width: { ideal: 2560 }, height: { ideal: 1920 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamState("on");
    } catch (e) {
      const name = (e as Error).name;
      setCamState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "none");
    }
  }, []);

  useEffect(() => {
    if (left > 0) start(facing);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  // iOS kills the stream when the tab is backgrounded; restart on return.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") stop();
      else if (left > 0) start(facing);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [facing, left, start]);

  const pump = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    while (queue.current.length) {
      const job = queue.current[0];
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        try {
          const fd = new FormData();
          fd.set("full", job.shot.full, "photo.jpg");
          fd.set("thumb", job.shot.thumb, "thumb.jpg");
          fd.set("width", String(job.shot.width));
          fd.set("height", String(job.shot.height));
          fd.set("source", job.source);
          const r = await fetch(`/api/e/${slug}/photos`, { method: "POST", body: fd });
          const j = await r.json().catch(() => ({}));
          if (r.ok) {
            ok = true;
            setLeft(j.left);
            showToast(`✓ ${t.guest.savedShot}`);
          } else if (j.error === "roll_done" || j.error === "ended") {
            queue.current = [];
            setLeft(0);
            ok = true;
          } else if (r.status < 500) {
            ok = true; // not retryable
            showToast(t.common.error, 2500);
          } else {
            await new Promise((res) => setTimeout(res, 1200 * (attempt + 1)));
          }
        } catch {
          await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
        }
      }
      if (!ok) showToast(t.common.error, 2500);
      queue.current.shift();
      setPending(queue.current.length);
    }
    working.current = false;
  }, [slug, showToast, t]);

  const enqueue = (shot: Processed, source: Job["source"]) => {
    queue.current.push({ shot, source });
    setPending(queue.current.length);
    const url = URL.createObjectURL(shot.thumb);
    setLastThumb((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
    pump();
  };

  const shoot = async () => {
    const v = videoRef.current;
    if (!v || camState !== "on" || left - pending <= 0 || !v.videoWidth) return;
    setFlash((n) => n + 1);
    if ("vibrate" in navigator) navigator.vibrate?.(30);
    const optimisticLeft = left - pending - 1;
    try {
      const shot = await developFrame(v, v.videoWidth, v.videoHeight, { look, stamp, mirror: facing === "user" });
      enqueue(shot, "camera");
      if (optimisticLeft <= 0) stop();
    } catch {
      showToast(t.common.error, 2500);
    }
  };

  const fromGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = left - pending;
    const list = Array.from(files).slice(0, Math.max(0, room));
    for (const file of list) {
      try {
        const { src, w, h, date } = await loadImageFile(file);
        const shot = await developFrame(src, w, h, { look, stamp, date });
        enqueue(shot, "upload");
      } catch {
        showToast(t.common.error, 2500);
      }
    }
  };

  const remaining = Math.max(0, left - pending);
  const done = remaining <= 0;
  const d = new Date();
  const stampText = `'${String(d.getFullYear()).slice(2)}  ${String(d.getMonth() + 1).padStart(2, "0")}  ${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div className="cam">
      <div className="cam-top">
        <Link href={`/e/${slug}`} className="cam-pill" aria-label={eventName}>
          ← <span style={{ maxWidth: "38vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventName}</span>
        </Link>
        <span className={`cam-counter ${remaining <= 3 ? "low" : ""}`} title={t.guest.shotsLeft}>
          {remaining}/{total}
        </span>
        <Link href={`/e/${slug}/album`} className="cam-pill">{t.guest.toAlbum}</Link>
      </div>

      <div className="cam-view">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={facing === "user" ? "mirror" : ""}
          style={{ filter: lk.css, opacity: camState === "on" && !done ? 1 : 0.15 }}
        />
        <div className="cam-vignette" />
        <span className="cam-look">{lk.name[lang]}</span>
        {stamp && camState === "on" && !done && <span className="cam-stamp">{stampText}</span>}
        <div key={flash} className={`cam-flash ${flash ? "go" : ""}`} />
        {done ? (
          <div className="cam-msg">
            <p style={{ margin: "0 0 14px" }}>🎞️ {t.guest.rollDone}</p>
            <Link href={`/e/${slug}/album`} className="btn btn-light btn-small">{t.guest.toAlbum} →</Link>
          </div>
        ) : camState === "denied" || camState === "none" ? (
          <div className="cam-msg">{camState === "denied" ? t.guest.camDenied : t.guest.camNone}</div>
        ) : null}
      </div>

      <div className="cam-bar">
        <div className="side">
          {allowUploads ? (
            <label className="cam-side-btn" aria-label={t.guest.upload} title={t.guest.upload} style={{ opacity: done ? 0.35 : 1 }}>
              {lastThumb ? (
                <img src={lastThumb} alt="" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></svg>
              )}
              <input type="file" accept="image/*" multiple hidden disabled={done} onChange={(e) => { fromGallery(e.target.files); e.target.value = ""; }} />
            </label>
          ) : (
            <span className="cam-side-btn" aria-hidden="true">
              {lastThumb ? <img src={lastThumb} alt="" /> : null}
            </span>
          )}
        </div>
        <button className="shutter" onClick={shoot} disabled={done || camState !== "on"} aria-label={t.guest.shoot} />
        <div className="side r">
          <button
            className="cam-side-btn"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-label={t.guest.flip}
            title={t.guest.flip}
            disabled={done}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7h-3l-2-3H9L7 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" /><path d="M9 13a3 3 0 0 1 5.2-2M15 13a3 3 0 0 1-5.2 2" /><path d="M14 9v2h2M10 17v-2H8" /></svg>
          </button>
        </div>
      </div>
      {(toast || pending > 0) && <div className="toast">{toast || `${t.guest.saving} (${pending})`}</div>}
    </div>
  );
}
