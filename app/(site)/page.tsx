import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { HowItWorks, Faq } from "@/components/HowItWorks";

export default async function Home() {
  const { t, lang } = await getT();
  const [first, ...rest] = t.home.title.split(" ");
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">{t.home.eyebrow}</span>
            <h1>
              {first} <em>{rest.slice(0, 1).join(" ")}</em> {rest.slice(1).join(" ")}
            </h1>
            <p className="lead">{t.home.lead}</p>
            <div className="actions">
              <Link href="/buat" className="btn btn-accent">{t.home.ctaPrimary} →</Link>
              <Link href="/cara-kerja" className="btn btn-ghost">{t.home.ctaSecondary}</Link>
            </div>
            <ul className="pills">
              {t.home.pills.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="phone">
              <div className="phone-screen">
                <div className="phone-notch" />
                <div className="phone-top">
                  <span>{lang === "id" ? "Nikahan Raka & Dinda" : "Raka & Dinda's Wedding"}</span>
                  <span style={{ background: "#fff", color: "#111", fontWeight: 700 }}>17</span>
                </div>
                <div className="phone-view">
                  <div className="sun" />
                  <div className="hill" />
                  <div className="hill h2" />
                  <div className="people"><i /><i style={{ height: 56 }} /><i /></div>
                  <div className="grain" />
                  <div className="stamp">&apos;26 10 24</div>
                </div>
                <div className="phone-bar">
                  <div className="mini" />
                  <div className="shutter" />
                  <div className="mini" />
                </div>
              </div>
            </div>
            <div className="float-card fc1">
              <b>214</b>
              {t.common.photos} · 38 {t.common.guests}
            </div>
            <div className="float-card fc2">
              <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>{t.guest.developing.toUpperCase()}</span>
              <b>02:41:09</b>
            </div>
          </div>
        </div>
        <div className="film-strip" />
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>{t.home.why}</h2>
          </div>
          <div className="features">
            {t.home.features.map((f, i) => (
              <div key={f.t} className="card feature">
                <span className="num">0{i + 1}</span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks t={t} />
      <Faq t={t} />

      <section className="section" style={{ paddingTop: 0 }}>
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
