import type { Dict } from "@/lib/i18n";

export function HowItWorks({ t, headingLevel = 2 }: { t: Dict; headingLevel?: 1 | 2 }) {
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className="section" id="cara-kerja">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{t.how.eyebrow}</span>
          <H style={headingLevel === 1 ? { fontSize: "clamp(36px,6vw,64px)" } : undefined}>{t.how.title}</H>
          <p className="lead">{t.how.lead}</p>
        </div>
        <div className="acts">
          {t.how.acts.map((act) => (
            <article key={act.k} className="card act">
              <div className="act-head">
                <span className="k">{act.k}</span>
                <h3>{act.t}</h3>
              </div>
              <ol>
                {act.steps.map((s) => (
                  <li key={s.t}>
                    <div>
                      <b>{s.t}</b>
                      <p>{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ t, light = false }: { t: Dict; light?: boolean }) {
  return (
    <section className={`section ${light ? "section-light" : ""}`} style={light ? undefined : { paddingTop: 24 }}>
      <div className="wrap narrow">
        <div className="section-head">
          <h2>{t.how.faqTitle}</h2>
        </div>
        <div className="faq">
          {t.how.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
