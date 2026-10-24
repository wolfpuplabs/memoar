"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18n";
import { LOOKS } from "@/lib/filters";
import { prepareCover } from "@/lib/image-client";

const KINDS = ["pernikahan", "lamaran", "ulangtahun", "pesta", "wisuda", "kantor", "lainnya"];

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function Stepper({ value, onChange, min, max, step = 1 }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(n))));
  return (
    <div className="stepper">
      <button type="button" onClick={() => set(value - step)} aria-label="-">−</button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} onChange={(e) => set(Number(e.target.value) || min)} />
      <button type="button" onClick={() => set(value + step)} aria-label="+">+</button>
    </div>
  );
}

export default function CreateWizard({ maxGuestsLimit, origin, firstFree = false }: { maxGuestsLimit: number; origin: string; firstFree?: boolean }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(() => {
    const s = new Date();
    s.setHours(s.getHours() + 1, 0, 0, 0);
    const e = new Date(s.getTime() + 5 * 3600_000);
    return { s: toLocalInput(s), e: toLocalInput(e) };
  }, []);

  const [f, setF] = useState({
    kind: "pernikahan",
    name: "",
    hostName: "",
    message: "",
    startsAt: defaults.s,
    endsAt: defaults.e,
    revealMode: "end",
    revealDelayHours: 12,
    filter: LOOKS[0].id,
    dateStamp: true,
    shotsPerGuest: 24,
    maxGuests: 50,
    allowUploads: true,
    visibility: "everyone",
    slug: "",
  });
  const up = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<{ ok: boolean; reason: string | null } | null>(null);
  const [cover, setCover] = useState<Blob | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) up("slug", slugify(f.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.name, slugTouched]);

  useEffect(() => {
    if (!f.slug) return setSlugState(null);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/slug?s=${encodeURIComponent(f.slug)}`).then((r) => r.json());
        setSlugState({ ok: r.ok, reason: r.reason });
      } catch {
        setSlugState(null);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [f.slug]);

  const slugMsg: Record<string, string> = { slug_taken: t.create.slugTaken, slug_short: t.create.slugShort, slug_chars: t.create.slugChars };

  const validate = (s: number) => {
    if (s === 0 && !f.name.trim()) return t.create.errName;
    if (s === 1 && new Date(f.endsAt) <= new Date(f.startsAt)) return t.create.errEndBeforeStart;
    if (s === 3 && slugState && !slugState.ok) return slugMsg[slugState.reason || ""] || t.create.slugTaken;
    return null;
  };

  const next = () => {
    const e = validate(step);
    setError(e);
    if (!e) setStep((s) => Math.min(3, s + 1));
  };

  const pickCover = async (file?: File) => {
    if (!file) return;
    const blob = await prepareCover(file);
    setCover(blob);
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    setCoverUrl(URL.createObjectURL(blob));
  };

  const submit = async () => {
    const e = validate(3) || validate(1) || validate(0);
    setError(e);
    if (e) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set(
        "data",
        JSON.stringify({
          ...f,
          startsAt: new Date(f.startsAt).toISOString(),
          endsAt: new Date(f.endsAt).toISOString(),
        })
      );
      if (cover) fd.set("cover", cover, "cover.jpg");
      const r = await fetch("/api/events", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        setError(slugMsg[j.error] || (j.error === "dates" ? t.create.errEndBeforeStart : t.common.error));
        if (j.error?.startsWith("slug")) setStep(3);
        setBusy(false);
        return;
      }
      router.push(`/kelola/${j.slug}?baru=1`);
    } catch {
      setError(t.common.error);
      setBusy(false);
    }
  };

  const reveals = [
    { id: "live", t: t.create.revealLive, d: t.create.revealLiveD },
    { id: "end", t: t.create.revealEnd, d: t.create.revealEndD },
    { id: "delayed", t: t.create.revealDelayed, d: t.create.revealDelayedD },
  ];

  return (
    <div className="wizard">
      <div className="wrap narrow">
        <span className="wizard-steps-label">
          {step + 1}/4 · {t.create.steps[step]}
        </span>
        <h1 style={{ fontSize: "clamp(32px,5vw,48px)", marginTop: 8 }}>{t.create.title}</h1>
        {firstFree && <div className="free-badge"><span>★</span>{t.create.firstFree}</div>}
        <div className="wizard-steps">
          {t.create.steps.map((_, i) => <span key={i} className={i <= step ? "on" : ""} />)}
        </div>

        <div className="card pad">
          {step === 0 && (
            <>
              <div className="field">
                <span className="label">{t.create.kind}</span>
                <div className="choice-grid">
                  {KINDS.map((k) => (
                    <button type="button" key={k} className={`choice ${f.kind === k ? "on" : ""}`} onClick={() => up("kind", k)}>
                      <b>{t.kinds[k]}</b>
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span className="label">{t.create.name}</span>
                <input type="text" value={f.name} maxLength={80} placeholder={t.create.namePh} onChange={(e) => up("name", e.target.value)} autoFocus />
              </label>
              <label className="field">
                <span className="label">{t.create.host}</span>
                <input type="text" value={f.hostName} maxLength={80} placeholder={t.create.hostPh} onChange={(e) => up("hostName", e.target.value)} />
              </label>
              <label className="field">
                <span className="label">{t.create.message}</span>
                <textarea value={f.message} maxLength={240} placeholder={t.create.messagePh} onChange={(e) => up("message", e.target.value)} />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid2">
                <label className="field">
                  <span className="label">{t.create.start}</span>
                  <input type="datetime-local" value={f.startsAt} onChange={(e) => up("startsAt", e.target.value)} />
                </label>
                <label className="field">
                  <span className="label">{t.create.end}</span>
                  <input type="datetime-local" value={f.endsAt} min={f.startsAt} onChange={(e) => up("endsAt", e.target.value)} />
                </label>
              </div>
              <div className="field">
                <span className="label">{t.create.reveal}</span>
                <div className="choice-list">
                  {reveals.map((r) => (
                    <button type="button" key={r.id} className={`choice ${f.revealMode === r.id ? "on" : ""}`} onClick={() => up("revealMode", r.id)}>
                      <b>{r.t}</b>
                      <span>{r.d}</span>
                    </button>
                  ))}
                </div>
              </div>
              {f.revealMode === "delayed" && (
                <div className="field">
                  <span className="label">{t.create.delayHours}</span>
                  <Stepper value={f.revealDelayHours} onChange={(n) => up("revealDelayHours", n)} min={1} max={72} />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="field">
                <span className="label">{t.create.look}</span>
                <div className="choice-grid">
                  {LOOKS.map((l) => (
                    <button type="button" key={l.id} className={`choice ${f.filter === l.id ? "on" : ""}`} onClick={() => up("filter", l.id)}>
                      <div className="swatch" style={{ background: `linear-gradient(135deg, ${l.swatch[0]}, ${l.swatch[1]})` }} />
                      <b>{l.name[lang]}</b>
                      <span>{l.note[lang]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="toggle field">
                <span className="t-text">
                  <b>{t.create.stamp}</b>
                  <span>{t.create.stampD}</span>
                </span>
                <input type="checkbox" checked={f.dateStamp} onChange={(e) => up("dateStamp", e.target.checked)} />
              </label>
              <div className="field">
                <span className="label">{t.create.cover}</span>
                <div className="cover-pick">
                  <div className="thumb" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined} />
                  <label className="btn btn-ghost btn-small">
                    {coverUrl ? t.create.coverChange : t.create.coverPick}
                    <input type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid2">
                <div className="field">
                  <span className="label">{t.create.shots}</span>
                  <Stepper value={f.shotsPerGuest} onChange={(n) => up("shotsPerGuest", n)} min={5} max={50} />
                </div>
                <div className="field">
                  <span className="label">{t.create.maxGuests}</span>
                  <Stepper value={f.maxGuests} onChange={(n) => up("maxGuests", n)} min={1} max={maxGuestsLimit} step={5} />
                </div>
              </div>
              <label className="toggle field">
                <span className="t-text">
                  <b>{t.create.uploads}</b>
                  <span>{t.create.uploadsD}</span>
                </span>
                <input type="checkbox" checked={f.allowUploads} onChange={(e) => up("allowUploads", e.target.checked)} />
              </label>
              <div className="field">
                <span className="label">{t.create.visibility}</span>
                <div className="choice-grid">
                  {[
                    { id: "everyone", l: t.create.visEveryone },
                    { id: "host", l: t.create.visHost },
                  ].map((v) => (
                    <button type="button" key={v.id} className={`choice ${f.visibility === v.id ? "on" : ""}`} onClick={() => up("visibility", v.id)}>
                      <b>{v.l}</b>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">{t.create.slug}</span>
                <div className="slugfield">
                  <span className="prefix">{origin.replace(/^https?:\/\//, "")}/e/</span>
                  <input
                    type="text"
                    value={f.slug}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => {
                      setSlugTouched(true);
                      up("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40));
                    }}
                  />
                </div>
                {slugState ? (
                  slugState.ok ? <span className="ok">✓ {t.create.slugOk}</span> : <span className="err">{slugMsg[slugState.reason || ""]}</span>
                ) : (
                  <span className="hint">{t.create.slugHint}</span>
                )}
              </div>
            </>
          )}

          {error && <p className="err" style={{ marginTop: 0 }}>{error}</p>}

          <div className="wizard-nav">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={() => { setError(null); setStep(step - 1); }} disabled={busy}>
                ← {t.common.back}
              </button>
            ) : <span />}
            {step < 3 ? (
              <button type="button" className="btn" onClick={next}>{t.common.next} →</button>
            ) : (
              <button type="button" className="btn btn-accent" onClick={submit} disabled={busy}>
                {busy ? t.create.creating : t.create.submit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
