"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "./I18n";
import { Print, Scene, type SceneKind } from "./Illustrations";

/* decorative QR-like pattern (illustration only, not scannable) */
function PseudoQR({ size = 25 }: { size?: number }) {
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
}

const ALBUM: SceneKind[] = ["party", "cake", "toast", "dance", "couple", "party"];

export default function Story() {
  const { t } = useT();
  const s = t.story;
  const [active, setActive] = useState(0);
  const [shots, setShots] = useState(24);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 899px)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: narrow ? "-62% 0px -22% 0px" : "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // the roll counts down while the "shoot" chapter is on screen
  useEffect(() => {
    if (active !== 2) return;
    setShots(24);
    const id = setInterval(() => setShots((n) => (n > 17 ? n - 1 : n)), 750);
    return () => clearInterval(id);
  }, [active]);

  const on = (i: number) => (active === i ? "on" : "");

  return (
    <section className="story" aria-labelledby="story-title">
      <div className="wrap">
        <div className="section-head story-head">
          <span className="eyebrow">{s.eyebrow}</span>
          <h2 id="story-title">{s.title}</h2>
        </div>
      </div>

      <div className="wrap story-grid">
        <div className="stage" aria-hidden="true">
          <div className="stage-inner" data-active={active}>
            {/* prints that fly out in the last chapter */}
            <Print kind="cake" id="st-p1" caption="Bima · 20.14" className={`fly fly-1 ${on(4)}`} lite />
            <Print kind="toast" id="st-p2" caption="Citra · 21.02" className={`fly fly-2 ${on(4)}`} lite />
            <Print kind="dance" id="st-p3" caption="Ayu · 22.37" className={`fly fly-3 ${on(4)}`} lite />
            <Print kind="couple" id="st-p4" caption="Dimas · 19.48" className={`fly fly-4 ${on(4)}`} lite />

            {/* table card next to the phone in chapter 2 */}
            <div className={`table-card ${on(1)}`}>
              <PseudoQR />
              <b>Nikahan Raka &amp; Dinda</b>
              <span>{s.stage.scan}</span>
            </div>

            {/* guests joining in chapter 3 */}
            <div className={`join-chips ${on(2)}`}>
              {["Ayu", "Bima", "Citra"].map((n, i) => (
                <span key={n} className="join-chip" style={{ transitionDelay: `${i * 180}ms` }}>
                  <i>{n[0]}</i>{n}<span className="jc-joined">&nbsp;{s.stage.joined}</span>
                </span>
              ))}
            </div>

            <div className="phone stage-phone">
              <div className="phone-screen">
                <div className="phone-notch" />

                {/* 1 — create */}
                <div className={`screen screen-create ${on(0)}`}>
                  <div className="sc-title">memoar</div>
                  <div className="sc-field"><small>{t.create.name}</small>Nikahan Raka &amp; Dinda</div>
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

                {/* 2 — qr */}
                <div className={`screen screen-qr ${on(1)}`}>
                  <div className="sc-qr"><PseudoQR /></div>
                  <b>Nikahan Raka &amp; Dinda</b>
                  <span>{s.stage.scan}</span>
                </div>

                {/* 3 — shoot */}
                <div className={`screen screen-shoot ${on(2)}`}>
                  <Scene kind="party" id="st-party" />
                  <div className="vf-top"><span>Nikahan Raka &amp; Dinda</span><span className="vf-count">{shots}/24</span></div>
                  <div className="vf-brackets"><i /><i /><i /><i /></div>
                  <div className="vf-stamp">&apos;26 10 24</div>
                  {active === 2 && shots < 24 && <div key={shots} className="vf-flash" />}
                  <div className="vf-bar"><i /><b /><i /></div>
                </div>

                {/* 4 — developing */}
                <div className={`screen screen-dev ${on(3)}`}>
                  <div className="dev-roll" />
                  <span className="dev-label">{s.stage.developing}</span>
                  <div className="dev-count"><b>02</b>:<b>41</b>:<b>09</b></div>
                  <div className="dev-tiles">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
                </div>

                {/* 5 — album */}
                <div className={`screen screen-album ${on(4)}`}>
                  <div className="al-head"><b>{s.stage.album}</b><span>214 {s.stage.photos}</span></div>
                  <div className="al-grid">
                    {ALBUM.map((k, i) => <Scene key={i} kind={k} id={`st-al${i}`} lite />)}
                  </div>
                </div>
              </div>
            </div>

            <div className="stage-progress">
              {s.chapters.map((c, i) => <i key={c.k} className={i <= active ? "on" : ""} />)}
            </div>
          </div>
        </div>

        <div className="chapters">
          {s.chapters.map((c, i) => (
            <article
              key={c.k}
              className={`chapter ${active === i ? "on" : ""}`}
              data-i={i}
              ref={(el) => { refs.current[i] = el; }}
            >
              <div className="chapter-card">
                <span className="chapter-k">{c.k}</span>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
