import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { Faq } from "@/components/HowItWorks";
import Story from "@/components/Story";
import { Icons, Print, Scene, type SceneKind } from "@/components/Illustrations";

const ROLL: { kind: SceneKind; caption: string }[] = [
  { kind: "dip", caption: "Ayu · 21.14" },
  { kind: "cake-cut", caption: "Bima · 20.02" },
  { kind: "kiss", caption: "Dimas · 19.48" },
  { kind: "cheers", caption: "Citra · 21.30" },
  { kind: "dance-floor", caption: "Raka · 22.41" },
  { kind: "shoulders", caption: "Sari · 22.05" },
  { kind: "birthday", caption: "Nadia · 23.10" },
  { kind: "toast-arch", caption: "Yoga · 19.31" },
  { kind: "night-dance", caption: "Tari · 22.58" },
  { kind: "champagne", caption: "Gilang · 20.40" },
];

const GRID: { kind: SceneKind; who: string }[] = [
  { kind: "dip", who: "Ayu" },
  { kind: "kiss", who: "Dimas" },
  { kind: "hands-up", who: "Raka" },
  { kind: "cheers", who: "Citra" },
];

const FEATURE_ICONS = [Icons.angle, Icons.roll, Icons.reveal, Icons.download];

export default async function Home() {
  const { t, lang } = await getT();
  const [first, ...rest] = t.home.title.split(" ");
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">{t.home.eyebrow}</span>
            <h1>
              {first} <em>{rest.slice(0, 1).join(" ")}</em> {rest.slice(1).join(" ")}
            </h1>
            <p className="lead">{t.home.lead}</p>
            <div className="actions">
              <Link href="/buat" className="btn btn-accent">{t.home.ctaPrimary} →</Link>
              <Link href="#cerita" className="btn btn-ghost">{t.home.ctaSecondary}</Link>
            </div>
            <ul className="pills">
              {t.home.pills.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>

          <div className="hero-art" aria-hidden="true">
            <Print kind="cake-cut" caption="Bima · 20.02" className="hp hp-1" eager />
            <Print kind="sunset" caption="Dimas · 19.48" className="hp hp-2" eager />
            <Print kind="champagne" caption="Citra · 21.30" className="hp hp-3" eager />
            <div className="phone hero-phone">
              <div className="phone-screen">
                <div className="phone-notch" />
                <div className="mock-eh">
                  <div className="me-cover">
                    <Scene kind="confetti" eager />
                    <div className="me-head">
                      <b>{lang === "id" ? "Nikahan Raka & Dinda" : "Raka & Dinda's Wedding"}</b>
                      <div className="me-stats">
                        <span><b>{lang === "id" ? "1.284" : "1,284"}</b>{t.guest.moments}</span>
                        <span><b>1{t.time.d} 23{t.time.h}</b>{t.guest.timeLeft}</span>
                        <span><b>86</b>{t.guest.people}</span>
                      </div>
                    </div>
                  </div>
                  <div className="me-actions"><i className="me-cam" /><i /><i /></div>
                  <div className="me-grid">
                    {GRID.map((g) => (
                      <div key={g.kind} className="me-tile"><Scene kind={g.kind} lite /><span>{g.who}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="float-card fc1">
              <b>214</b>
              {t.common.photos} · 38 {t.common.guests}
            </div>
          </div>
        </div>
        <div className="scroll-hint" aria-hidden="true"><span /></div>
      </section>

      <div id="cerita" />
      <Story />

      <section className="roll-band" aria-label={t.story.rollTitle}>
        <div className="wrap"><span className="eyebrow">{t.story.rollTitle}</span></div>
        <div className="marquee">
          <div className="marquee-track">
            {[0, 1].map((dup) =>
              ROLL.map((r, i) => (
                <Print key={`${dup}-${i}`} kind={r.kind} caption={r.caption} className={`mq ${i % 2 ? "tilt-r" : "tilt-l"}`} />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>{t.home.why}</h2>
          </div>
          <div className="features">
            {t.home.features.map((f, i) => (
              <div key={f.t} className="card feature">
                <span className="num">{FEATURE_ICONS[i]}</span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Faq t={t} light />

      <section className="section" style={{ paddingTop: 72 }}>
        <div className="wrap">
          <div className="cta-band">
            <h2>{t.home.ctaTitle}</h2>
            <p>{t.home.ctaLead}</p>
            <Link href="/buat" className="btn btn-accent">{t.home.ctaPrimary} →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
