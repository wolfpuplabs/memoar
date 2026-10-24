"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "./I18n";
import { Print, Scene, type SceneKind } from "./Illustrations";

/* decorative QR-like pattern (illustration only, not scannable) */
const PseudoQR = memo(function PseudoQR({ size = 25 }: { size?: number }) {
  const cells = useMemo(() => {
    let s = 4242;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const out: [number, number][] = [];
    const finder = (x: number, y: number) => x < 7 && y < 7;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const inFinder = finder(x, y) || finder(size - 1 - x, y) || finder(x, size - 1 - y);
        if (!inFinder && rnd() > 0.52) out.push([x, y]);
      }
    return out;
  }, [size]);
  const Finder = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" rx="1.6" fill="#0a0a0c" />
      <rect x="1" y="1" width="5" height="5" rx="1.1" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" rx=".7" fill="#0a0a0c" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${size + 2} ${size + 2}`} className="pqr" aria-hidden="true">
      <rect x="-1" y="-1" width={size + 2} height={size + 2} rx="2" fill="#fff" />
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width=".84" height=".84" rx=".25" fill="#0a0a0c" />)}
      <Finder x={0} y={0} />
      <Finder x={size - 7} y={0} />
      <Finder x={0} y={size - 7} />
    </svg>
  );
});

const ALBUM: SceneKind[] = ["dip", "cake", "glasses", "dance-floor", "kiss", "reception"];
const N = 5;
const DEV_SECONDS = 2 * 3600 + 41 * 60 + 9; // 02:41:09

const hms = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, "0"));
};

/**
 * Scroll-locked story. The section is tall; an inner frame sticks to the
 * viewport while scroll progress (0–1) picks the chapter and drives the
 * small animations. Every chapter gets the same scroll distance and its
 * caption stays on screen the whole time.
 */
export default function Story() {
  const { t } = useT();
  const s = t.story;
  const demo = s.demo;
  const sectionRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [shots, setShots] = useState(24);
  const [joined, setJoined] = useState(0);
  const [developed, setDeveloped] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const dist = rect.height - window.innerHeight;
      const p = dist > 0 ? Math.min(1, Math.max(0, -rect.top / dist)) : 0;
      const pn = p * N;
      const idx = Math.min(N - 1, Math.floor(pn));
      const local = Math.min(1, pn - idx);
      el.style.setProperty("--p5", pn.toFixed(3));
      el.style.setProperty("--lp", local.toFixed(3));
      setActive(idx);
      // chapter 3: the roll counts down and guests join as you scroll
      const shootLocal = Math.min(1, Math.max(0, pn - 2));
      setShots(24 - Math.min(7, Math.floor(shootLocal * 8)));
      setJoined(Math.min(3, Math.floor(shootLocal * 4.2)));
      // chapter 4: developing countdown runs to zero
      const devLocal = Math.min(1, Math.max(0, pn - 3));
      if (countRef.current) {
        const [h, m, sec] = hms(DEV_SECONDS * (1 - devLocal));
        countRef.current.innerHTML = `<b>${h}</b>:<b>${m}</b>:<b>${sec}</b>`;
      }
      setDeveloped(devLocal > 0.92 || idx === 4);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const jump = useCallback((i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const dist = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.35) / N) * dist, behavior: "smooth" });
  }, []);

  const on = (i: number) => (active === i ? "on" : "");
  const [h0, m0, s0] = hms(DEV_SECONDS);

  return (
    <>
      <div className="wrap story-head">
        <span className="eyebrow">{s.eyebrow}</span>
        <h2 id="story-title">{s.title}</h2>
      </div>

      <section className="story" ref={sectionRef} aria-labelledby="story-title" style={{ ["--n" as string]: N }}>
        <div className="story-sticky">
          <div className="wrap story-frame">
            {/* captions: always one visible, crossfading in place */}
            <div className="story-copy">
              <div className="caps" aria-live="polite">
                {s.chapters.map((c, i) => (
                  <article key={c.k} className={`cap ${i === active ? "on" : i < active ? "past" : "next"}`} aria-hidden={i !== active}>
                    <span className="cap-k">{c.k} <i>/ 0{N}</i></span>
                    <h3>{c.t}</h3>
                    <p>{c.d}</p>
                  </article>
                ))}
              </div>
              <div className="story-progress" role="tablist" aria-label={s.eyebrow}>
                {s.chapters.map((c, i) => (
                  <button
                    key={c.k}
                    role="tab"
                    aria-selected={i === active}
                    aria-label={c.t}
                    className={i === active ? "on" : ""}
                    style={{ ["--i" as string]: i }}
                    onClick={() => jump(i)}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>

            <div className="stage" aria-hidden="true">
              <div className="stage-inner">
                <Print kind="cake-cut" caption="Bima · 20.14" className={`fly fly-1 ${on(4)}`} />
                <Print kind="cheers" caption="Citra · 21.02" className={`fly fly-2 ${on(4)}`} />
                <Print kind="shoulders" caption="Ayu · 22.37" className={`fly fly-3 ${on(4)}`} />
                <Print kind="petals" caption="Dimas · 19.48" className={`fly fly-4 ${on(4)}`} />

                <div className={`table-card ${on(1)}`}>
                  <PseudoQR />
                  <b>{demo}</b>
                  <span>{s.stage.scan}</span>
                </div>

                <div className={`join-chips ${active === 2 ? "on" : ""}`}>
                  {["Ayu", "Bima", "Citra"].map((n, i) => (
                    <span key={n} className={`join-chip ${active === 2 && joined > i ? "in" : ""}`}>
                      <i>{n[0]}</i>{n}<span className="jc-joined">&nbsp;{s.stage.joined}</span>
                    </span>
                  ))}
                </div>

                <div className="phone stage-phone">
                  <div className="phone-screen">
                    <div className="phone-notch" />

                    <div className={`screen screen-create ${on(0)}`}>
                      <div className="sc-title">memoar</div>
                      <div className="sc-field"><small>{t.create.name}</small>{demo}</div>
                      <div className="sc-label">{s.stage.look}</div>
                      <div className="sc-swatches">
                        {["#e9e9ec", "#b7b7be", "#85858d", "#55555c", "#2a2a2f"].map((c, i) => (
                          <i key={c} style={{ background: c }} className={i === 1 ? "sel" : ""} />
                        ))}
                      </div>
                      <div className="sc-stepper"><span>−</span><b>24</b><span>+</span></div>
                      <div className="sc-hint">{s.stage.shots}</div>
                      <div className="sc-btn">{t.create.submit}</div>
                    </div>

                    <div className={`screen screen-qr ${on(1)}`}>
                      <div className="sc-qr"><PseudoQR /></div>
                      <b>{demo}</b>
                      <span>{s.stage.scan}</span>
                    </div>

                    <div className={`screen screen-shoot ${on(2)}`}>
                      <Scene kind="night-dance" />
                      <div className="vf-top"><span>{demo}</span><span className="vf-count">{shots}/24</span></div>
                      <div className="vf-brackets"><i /><i /><i /><i /></div>
                      <div className="vf-stamp">&apos;26 10 24</div>
                      {active === 2 && shots < 24 && <div key={shots} className="vf-flash" />}
                      <div className="vf-bar"><i /><b /><i /></div>
                    </div>

                    <div className={`screen screen-dev ${on(3)}`}>
                      <div className="dev-roll" />
                      <span className="dev-label">{s.stage.developing}</span>
                      <div className="dev-count" ref={countRef}><b>{h0}</b>:<b>{m0}</b>:<b>{s0}</b></div>
                      <div className="dev-tiles">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
                    </div>

                    <div className={`screen screen-album ${on(4)} ${developed ? "developed" : ""}`}>
                      <div className="al-head"><b>{s.stage.album}</b><span>214 {s.stage.photos}</span></div>
                      <div className="al-grid">
                        {ALBUM.map((k, i) => <Scene key={i} kind={k} lite style={{ transitionDelay: `${i * 70}ms` }} />)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
