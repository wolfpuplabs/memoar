/**
 * memoar illustrations — original monochrome SVG scenes drawn in code.
 * Every scene takes an `id` prefix so several can live on one page without
 * their gradient/filter ids clashing.
 */
import { memo, type CSSProperties } from "react";

export type SceneKind = "party" | "cake" | "toast" | "dance" | "couple";

type Pose = "idle" | "cheer" | "toast" | "dance" | "lean";

/* deterministic pseudo-random so server and client render the same art */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function Person({
  x, base, s = 1, pose = "idle", fill = "#0a0a0c", rim = "rgba(255,255,255,.32)", dress = false, flip = false,
}: { x: number; base: number; s?: number; pose?: Pose; fill?: string; rim?: string; dress?: boolean; flip?: boolean }) {
  const arm = { stroke: fill, strokeWidth: 9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const rimArm = { ...arm, stroke: rim, strokeWidth: 10.5 };
  const arms: Record<Pose, string[]> = {
    idle: ["M -21 -144 Q -29 -118 -27 -88", "M 21 -144 Q 29 -118 27 -88"],
    cheer: ["M -21 -144 Q -36 -172 -34 -205", "M 21 -144 Q 36 -172 34 -205"],
    toast: ["M -21 -144 Q -29 -118 -27 -88", "M 21 -144 Q 40 -160 34 -196"],
    dance: ["M -21 -144 Q -44 -150 -58 -170", "M 21 -144 Q 34 -175 26 -210"],
    lean: ["M -21 -144 Q -26 -116 -16 -98", "M 21 -144 Q 30 -120 34 -96"],
  };
  const body = dress
    ? "M -20 -152 Q -25 -150 -25 -138 L -19 -96 L -44 0 L 44 0 L 19 -96 L 25 -138 Q 25 -150 20 -152 Z"
    : "M -21 -152 Q -27 -150 -27 -136 L -21 -62 L -16 0 L -3 0 L 0 -58 L 3 0 L 16 0 L 21 -62 L 27 -136 Q 27 -150 21 -152 Z";
  return (
    <g transform={`translate(${x} ${base}) scale(${flip ? -s : s} ${s})`}>
      {/* rim light */}
      <g opacity={0.9}>
        {arms[pose].map((d, i) => <path key={i} d={d} {...rimArm} />)}
        <path d={body} fill="none" stroke={rim} strokeWidth={2.4} />
        <circle cx={0} cy={-172} r={15.2} fill="none" stroke={rim} strokeWidth={2.4} />
      </g>
      {arms[pose].map((d, i) => <path key={i} d={d} {...arm} />)}
      <path d={body} fill={fill} />
      <rect x={-6} y={-160} width={12} height={12} fill={fill} />
      <circle cx={0} cy={-172} r={14} fill={fill} />
      {pose === "toast" && (
        <g transform="translate(34 -200)">
          <path d="M -5 -16 L 5 -16 L 3 -2 L -3 -2 Z" fill="rgba(255,255,255,.75)" />
          <rect x={-0.8} y={-2} width={1.6} height={8} fill="rgba(255,255,255,.75)" />
        </g>
      )}
    </g>
  );
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-blur-s`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
      <filter id={`${id}-blur-m`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      <filter id={`${id}-blur-l`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
      <filter id={`${id}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer><feFuncA type="table" tableValues="0 0.55" /></feComponentTransfer>
      </filter>
      <radialGradient id={`${id}-bk`}>
        <stop offset="0" stopColor="#fff" stopOpacity="1" />
        <stop offset=".55" stopColor="#fff" stopOpacity=".55" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-vig`} cx="50%" cy="45%" r="75%">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
      </radialGradient>
    </defs>
  );
}

function Finish({ id }: { id: string }) {
  return (
    <>
      <rect width="300" height="400" fill={`url(#${id}-vig)`} />
      <rect className="scene-grain" width="300" height="400" filter={`url(#${id}-grain)`} opacity="0.35" style={{ mixBlendMode: "overlay" }} />
    </>
  );
}

function Bokeh({ id, seed, count = 12, y0 = 0, y1 = 240 }: { id: string; seed: number; count?: number; y0?: number; y1?: number }) {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={r() * 300} cy={y0 + r() * (y1 - y0)} r={12 + r() * 28} fill={`url(#${id}-bk)`} opacity={0.06 + r() * 0.16} />
      ))}
    </g>
  );
}

function Confetti({ seed, count = 34, y1 = 300 }: { seed: number; count?: number; y1?: number }) {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const x = r() * 300, y = r() * y1, w = 2 + r() * 4, h = 4 + r() * 6, a = r() * 180;
        return <rect key={i} x={x} y={y} width={w} height={h} rx={1} transform={`rotate(${a} ${x} ${y})`} fill="#fff" opacity={0.35 + r() * 0.55} />;
      })}
    </g>
  );
}

function StringLights({ id, p0, p1, p2, n = 11 }: { id: string; p0: [number, number]; p1: [number, number]; p2: [number, number]; n?: number }) {
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1];
    return [x, y + 5] as const;
  });
  return (
    <g>
      <path d={`M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} stroke="rgba(255,255,255,.35)" strokeWidth="1" fill="none" />
      <g filter={`url(#${id}-blur-s)`}>{pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={6.5} fill="#fff" opacity={0.45} />)}</g>
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2} fill="#fff" />)}
    </g>
  );
}

function Party({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a41" /><stop offset=".55" stopColor="#1b1b1f" /><stop offset="1" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="20%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a30" /><stop offset="1" stopColor="#0b0b0d" />
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#${id}-sky)`} />
      <rect width="300" height="400" fill={`url(#${id}-glow)`} />
      <Bokeh id={id} seed={7} count={14} y0={20} y1={260} />
      <StringLights id={id} p0={[-10, 52]} p1={[150, 128]} p2={[310, 40]} n={12} />
      <StringLights id={id} p0={[-10, 104]} p1={[150, 168]} p2={[310, 92]} n={10} />
      <path d="M 0 300 Q 150 278 300 300 L 300 400 L 0 400 Z" fill={`url(#${id}-floor)`} />
      {/* back row */}
      <Person x={52} base={318} s={0.62} pose="idle" fill="#2c2c32" rim="rgba(255,255,255,.12)" />
      <Person x={250} base={316} s={0.6} pose="cheer" fill="#2c2c32" rim="rgba(255,255,255,.12)" />
      <Person x={160} base={312} s={0.55} pose="lean" fill="#303036" rim="rgba(255,255,255,.1)" dress />
      {/* front row */}
      <Person x={88} base={420} s={1.02} pose="toast" />
      <Person x={196} base={426} s={1.08} pose="cheer" dress flip />
      <Confetti seed={11} count={30} y1={260} />
      <Finish id={id} />
    </>
  );
}

function Cake({ id }: { id: string }) {
  const flames = [114, 132, 150, 168, 186];
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#25252a" /><stop offset="1" stopColor="#0a0a0c" />
        </linearGradient>
        <linearGradient id={`${id}-icing`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f2f5" /><stop offset="1" stopColor="#9c9ca4" />
        </linearGradient>
        <radialGradient id={`${id}-candle`} cx="50%" cy="38%" r="45%">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#${id}-bg)`} />
      <Bokeh id={id} seed={21} count={12} y0={10} y1={200} />
      <rect width="300" height="400" fill={`url(#${id}-candle)`} />
      {/* table */}
      <path d="M -10 300 L 310 300 L 310 400 L -10 400 Z" fill="#141417" />
      <path d="M -10 300 L 310 300" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
      <ellipse cx="150" cy="300" rx="96" ry="12" fill="#2c2c32" />
      {/* tiers */}
      <rect x="72" y="232" width="156" height="68" rx="10" fill={`url(#${id}-icing)`} />
      <rect x="98" y="176" width="104" height="58" rx="9" fill={`url(#${id}-icing)`} />
      <path d="M 72 246 Q 84 262 96 246 Q 108 264 120 246 Q 132 260 144 246 Q 156 266 168 246 Q 180 260 192 246 Q 204 264 216 246 Q 224 256 228 246 L 228 236 L 72 236 Z" fill="#fafafc" opacity=".9" />
      <path d="M 98 188 Q 108 202 118 188 Q 128 204 138 188 Q 148 200 158 188 Q 168 204 178 188 Q 188 200 202 188 L 202 180 L 98 180 Z" fill="#fafafc" opacity=".9" />
      {flames.map((x) => (
        <g key={x}>
          <rect x={x - 2.5} y={150} width={5} height={28} rx={1.5} fill="#d9d9de" />
          <ellipse cx={x} cy={140} rx={9} ry={14} fill="#fff" opacity={0.5} filter={`url(#${id}-blur-s)`} />
          <path d={`M ${x} 130 Q ${x + 5} 140 ${x} 148 Q ${x - 5} 140 ${x} 130 Z`} fill="#fff" />
        </g>
      ))}
      <Confetti seed={23} count={14} y1={150} />
      <Finish id={id} />
    </>
  );
}

function Toast({ id }: { id: string }) {
  const flute = (rot: number, x: number, y: number, k: number) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M -13 -78 L 13 -78 Q 12 -30 2 -8 L -2 -8 Q -12 -30 -13 -78 Z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.75)" strokeWidth="1.6" />
      <path d="M -11 -58 L 11 -58 Q 10 -28 1.5 -11 L -1.5 -11 Q -10 -28 -11 -58 Z" fill="rgba(235,235,240,.55)" />
      {[[-4, -40], [3, -30], [-1, -48], [5, -50], [-5, -24]].map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={1.2} fill="#fff" opacity=".9" />)}
      <rect x="-1.4" y="-8" width="2.8" height="44" fill="rgba(255,255,255,.75)" />
      <ellipse cx="0" cy="37" rx="13" ry="3" fill="rgba(255,255,255,.7)" />
      {/* hand */}
      <path d="M -14 22 Q -16 8 -6 6 L 8 6 Q 16 8 14 22 L 12 60 L -12 60 Z" fill="#0a0a0c" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" />
      <path d="M -12 60 L -16 200 L 16 200 L 12 60 Z" fill="#0a0a0c" />
    </g>
  );
  return (
    <>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="30%" r="80%">
          <stop offset="0" stopColor="#4a4a52" /><stop offset=".6" stopColor="#18181c" /><stop offset="1" stopColor="#08080a" />
        </radialGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#${id}-bg)`} />
      <Bokeh id={id} seed={33} count={16} y0={0} y1={400} />
      {flute(-26, 92, 262, 1)}
      {flute(4, 156, 250, 2)}
      {flute(30, 214, 266, 3)}
      {/* sparkle at the clink */}
      <g transform="translate(152 150)">
        <circle r="20" fill="#fff" opacity=".35" filter={`url(#${id}-blur-m)`} />
        <path d="M 0 -18 L 3 -3 L 18 0 L 3 3 L 0 18 L -3 3 L -18 0 L -3 -3 Z" fill="#fff" />
      </g>
      <Confetti seed={37} count={22} y1={180} />
      <Finish id={id} />
    </>
  );
}

function Dance({ id }: { id: string }) {
  const r = rng(51);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1e23" /><stop offset="1" stopColor="#070709" />
        </linearGradient>
        <radialGradient id={`${id}-ball`} cx="38%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#a6a6ae" /><stop offset="1" stopColor="#3a3a40" />
        </radialGradient>
        <clipPath id={`${id}-ballclip`}><circle cx="150" cy="70" r="30" /></clipPath>
      </defs>
      <rect width="300" height="400" fill={`url(#${id}-bg)`} />
      {/* light rays */}
      <g opacity=".1">
        {[-60, -30, 0, 28, 58].map((a) => (
          <polygon key={a} points="150,70 135,420 165,420" fill="#fff" transform={`rotate(${a} 150 70)`} />
        ))}
      </g>
      <line x1="150" y1="0" x2="150" y2="40" stroke="rgba(255,255,255,.5)" strokeWidth="1.2" />
      <circle cx="150" cy="70" r="30" fill={`url(#${id}-ball)`} />
      <g clipPath={`url(#${id}-ballclip)`} stroke="rgba(0,0,0,.35)" strokeWidth="1">
        {[48, 56, 64, 72, 80, 88].map((y) => <line key={y} x1="110" y1={y} x2="190" y2={y} />)}
        {[126, 134, 142, 150, 158, 166, 174].map((x) => <line key={x} x1={x} y1="38" x2={x} y2="102" />)}
      </g>
      <circle cx="140" cy="58" r="6" fill="#fff" opacity=".9" filter={`url(#${id}-blur-s)`} />
      {/* specks of reflected light */}
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={r() * 300} cy={110 + r() * 230} r={0.8 + r() * 1.6} fill="#fff" opacity={0.3 + r() * 0.6} />
      ))}
      {/* floor */}
      <path d="M 0 320 L 300 320 L 300 400 L 0 400 Z" fill="#111114" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={i} x1={150} y1={320} x2={-150 + i * 100} y2={400} stroke="rgba(255,255,255,.07)" />
      ))}
      <Person x={72} base={404} s={0.9} pose="dance" />
      <Person x={160} base={410} s={1} pose="cheer" dress />
      <Person x={244} base={402} s={0.86} pose="dance" flip />
      <Finish id={id} />
    </>
  );
}

function Couple({ id }: { id: string }) {
  const r = rng(61);
  const leaves = (cx: number, cy: number, rad: number, from: number, to: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((from + ((to - from) * i) / (n - 1)) * Math.PI) / 180;
      const x = cx + Math.cos(a) * rad + (r() - 0.5) * 8;
      const y = cy + Math.sin(a) * rad + (r() - 0.5) * 8;
      return <ellipse key={`${cx}-${i}`} cx={x} cy={y} rx={4 + r() * 4} ry={2.5 + r() * 2} transform={`rotate(${r() * 180} ${x} ${y})`} fill={r() > 0.6 ? "#e9e9ee" : "#55555c"} opacity={0.85} />;
    });
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5a62" /><stop offset=".5" stopColor="#26262b" /><stop offset="1" stopColor="#0a0a0c" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#f2f2f5" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#${id}-bg)`} />
      <circle cx="150" cy="190" r="120" fill={`url(#${id}-sun)`} opacity=".5" />
      <circle cx="150" cy="190" r="56" fill="#fff" opacity=".9" filter={`url(#${id}-blur-s)`} />
      {/* floral arch */}
      <path d="M 52 400 L 52 190 A 98 98 0 0 1 248 190 L 248 400" fill="none" stroke="#1a1a1e" strokeWidth="9" />
      <g>{leaves(150, 190, 98, 180, 360, 34)}</g>
      <g>{leaves(52, 300, 0, 0, 0, 2)}</g>
      {/* ground */}
      <path d="M 0 340 Q 150 326 300 340 L 300 400 L 0 400 Z" fill="#0d0d10" />
      <Person x={124} base={404} s={1.02} pose="lean" />
      <Person x={180} base={404} s={0.98} pose="lean" dress flip />
      <Confetti seed={67} count={18} y1={140} />
      <Finish id={id} />
    </>
  );
}

const SCENES: Record<SceneKind, (p: { id: string }) => React.ReactElement> = {
  party: Party,
  cake: Cake,
  toast: Toast,
  dance: Dance,
  couple: Couple,
};

/** A full-bleed scene. `slice` crops to fill any aspect ratio (used inside the phone). */
function SceneImpl({ kind, id, className, style, slice = true, lite = false }: { kind: SceneKind; id: string; className?: string; style?: CSSProperties; slice?: boolean; lite?: boolean }) {
  const S = SCENES[kind];
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio={slice ? "xMidYMid slice" : "xMidYMid meet"} className={`scene ${lite ? "scene-lite" : ""} ${className ?? ""}`} style={style} aria-hidden="true">
      <Defs id={id} />
      <S id={id} />
    </svg>
  );
}

/** A developed print: white border, scene, handwritten-style caption. */
function PrintImpl({ kind, id, caption, className, style, lite }: { kind: SceneKind; id: string; caption?: string; className?: string; style?: CSSProperties; lite?: boolean }) {
  return (
    <figure className={`print ${className ?? ""}`} style={style}>
      <Scene kind={kind} id={id} className="print-img" lite={lite} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

// Memoised so scroll-driven re-renders of the story never re-diff the SVG art.
export const Scene = memo(SceneImpl);
export const Print = memo(PrintImpl);

/* line icons for feature cards ------------------------------------------------ */
const iconProps = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export const Icons = {
  angle: (
    <svg {...iconProps}><path d="M3 7l5-3h8l5 3v10l-5 3H8l-5-3z" /><circle cx="12" cy="12" r="3.2" /><path d="M12 4v2M12 18v2" /></svg>
  ),
  roll: (
    <svg {...iconProps}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 9h5v6h-5M6 6V4M9 6V4M12 6V4M6 20v-2M9 20v-2M12 20v-2" /></svg>
  ),
  reveal: (
    <svg {...iconProps}><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 3-5 4-5 6" /></svg>
  ),
  download: (
    <svg {...iconProps}><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
  ),
};
