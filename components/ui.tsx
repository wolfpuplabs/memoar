"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./I18n";

export function LangToggle({ dark = false }: { dark?: boolean }) {
  const { lang } = useT();
  const router = useRouter();
  const set = (l: string) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className={`lang ${dark ? "lang-dark" : ""}`} role="group" aria-label="Language">
      <button className={lang === "id" ? "on" : ""} onClick={() => set("id")}>ID</button>
      <button className={lang === "en" ? "on" : ""} onClick={() => set("en")}>EN</button>
    </div>
  );
}

export function LocalTime({ iso, mode = "datetime" }: { iso: string; mode?: "datetime" | "date" | "time" }) {
  const { lang } = useT();
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    const locale = lang === "id" ? "id-ID" : "en-GB";
    const opts: Intl.DateTimeFormatOptions =
      mode === "date"
        ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
        : mode === "time"
          ? { hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
    setTxt(d.toLocaleString(locale, opts));
  }, [iso, lang, mode]);
  return <time dateTime={iso} suppressHydrationWarning>{txt || " "}</time>;
}

export function useCountdown(iso: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = now === null ? null : Math.max(0, new Date(iso).getTime() - now);
  return ms;
}

/** "1d 23h", "5h 12m", "42m" — compact like a camera display. */
export function useShortCountdown(iso: string) {
  const { t } = useT();
  const ms = useCountdown(iso);
  if (ms === null) return "\u00a0";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}${t.time.d} ${h}${t.time.h}`;
  if (h > 0) return `${h}${t.time.h} ${mm}${t.time.m}`;
  return `${Math.max(mm, ms > 0 ? 1 : 0)}${t.time.m}`;
}

export function Countdown({ iso, onDone }: { iso: string; onDone?: () => void }) {
  const { t } = useT();
  const ms = useCountdown(iso);
  const fired = useRef(false);
  useEffect(() => {
    if (ms === 0 && onDone && !fired.current) {
      fired.current = true;
      onDone();
    }
  }, [ms, onDone]);
  if (ms === null) return <span className="countdown">&nbsp;</span>;
  const s = Math.floor(ms / 1000);
  const parts: [number, string][] = [
    [Math.floor(s / 86400), t.time.d],
    [Math.floor((s % 86400) / 3600), t.time.h],
    [Math.floor((s % 3600) / 60), t.time.m],
    [s % 60, t.time.s],
  ];
  const shown = parts[0][0] > 0 ? parts : parts.slice(1);
  return (
    <span className="countdown">
      {shown.map(([v, u], i) => (
        <span key={i} className="cd-cell">
          <b>{String(v).padStart(2, "0")}</b>
          <small>{u}</small>
        </span>
      ))}
    </span>
  );
}

export function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const { t } = useT();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <div className={`copyfield ${secret ? "secret" : ""}`}>
      <span className="label">{label}</span>
      <div className="copyrow">
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-small" onClick={copy}>
          {done ? t.common.copied : t.common.copy}
        </button>
      </div>
    </div>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo ${light ? "logo-light" : ""}`}>
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <rect x="2" y="7" width="28" height="20" rx="5" fill="currentColor" />
        <rect x="6" y="4" width="8" height="5" rx="1.5" fill="currentColor" />
        <circle cx="17" cy="17" r="6.5" fill="var(--logo-hole)" />
        <circle cx="17" cy="17" r="3.2" fill="currentColor" />
        <circle cx="25.5" cy="11.5" r="1.4" fill="var(--accent)" />
      </svg>
      <span className="logo-text">
        memoar
        <small className="logo-by">by wolfpuplabs</small>
      </span>
    </span>
  );
}
