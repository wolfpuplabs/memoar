import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { Faq } from "@/components/HowItWorks";
import Story from "@/components/Story";
import { Icons, Print, Scene, type SceneKind } from "@/components/Illustrations";

const ROLL: { kind: SceneKind; caption: string }[] = [
  { kind: "party", caption: "Ayu · 21.14" },
  { kind: "cake", caption: "Bima · 20.02" },
  { kind: "couple", caption: "Dimas · 19.48" },
  { kind: "toast", caption: "Citra · 21.30" },
  { kind: "dance", caption: "Raka · 22.41" },
  { kind: "cake", caption: "Sari · 20.05" },
  { kind: "party", caption: "Nadia · 23.10" },
  { kind: "toast", caption: "Yoga · 21.31" },
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
            <Print kind="cake" id="h-p1" caption="Bima · 20.02" className="hp hp-1" />
            <Print kind="couple" id="h-p2" caption="Dimas · 19.48" className="hp hp-2" />
            <Print kind="toast" id="h-p3" caption="Citra · 21.30" className="hp hp-3" />
            <div className="phone hero-phone">
              <div className="phone-screen">
                <div className="phone-notch" />
                <Scene kind="party" id="h-party" />
                <div className="vf-top">
                  <span>{lang === "id" ? "Nikahan Raka & Dinda" : "Raka & Dinda's Wedding"}</span>
                  <span className="vf-count">17/24</span>
                </div>
                <div className="vf-brackets"><i /><i /><i /><i /></div>
                <div className="vf-stamp">&apos;26 10 24</div>
                <div className="vf-bar"><i /><b /><i /></div>
              </div>
            </div>
            <div className="float-card fc1">
              <b>214</b>
              {t.common.photos} · 38 {t.common.guests}
            </div>
            <div className="float-card fc2">
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".12em" }}>{t.guest.developing.toUpperCase()}</span>
              <b>02:41:09</b>
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
                <Print key={`${dup}-${i}`} kind={r.kind} id={`mq-${dup}-${i}`} caption={r.caption} lite className={`mq ${i % 2 ? "tilt-r" : "tilt-l"}`} />
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
