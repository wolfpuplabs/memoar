/**
 * memoar film looks. Each look is applied pixel-by-pixel on a canvas so the
 * result is identical on every browser (Safari has no canvas `filter`).
 * `css` is only an approximation used for the live camera preview.
 */
export type Look = {
  id: string;
  name: { id: string; en: string };
  note: { id: string; en: string };
  swatch: [string, string];
  css: string;
  p: {
    exposure: number;
    contrast: number;
    saturation: number;
    warmth: number; // + warmer, - cooler (0..255 units)
    tint: number; // + magenta, - green
    fade: number; // 0..0.25 lifts blacks
    shadows: [number, number, number];
    highlights: [number, number, number];
    mono: boolean;
    grain: number; // 0..40
    vignette: number; // 0..0.8
  };
};

const base: Look["p"] = {
  exposure: 1,
  contrast: 1,
  saturation: 1,
  warmth: 0,
  tint: 0,
  fade: 0,
  shadows: [0, 0, 0],
  highlights: [0, 0, 0],
  mono: false,
  grain: 0,
  vignette: 0,
};

export const LOOKS: Look[] = [
  {
    id: "pagi",
    name: { id: "Pagi", en: "Morning" },
    note: { id: "Hangat, lembut, kulit tampak cerah", en: "Warm, soft, glowing skin" },
    swatch: ["#f6c48f", "#e98d5a"],
    css: "sepia(0.18) saturate(1.1) contrast(0.95) brightness(1.06)",
    p: { ...base, exposure: 1.05, contrast: 0.94, saturation: 1.08, warmth: 12, fade: 0.06, shadows: [10, 2, -6], highlights: [8, 4, -6], grain: 10, vignette: 0.25 },
  },
  {
    id: "senja",
    name: { id: "Senja", en: "Dusk" },
    note: { id: "Oranye keemasan, warna pekat", en: "Golden orange, rich colour" },
    swatch: ["#ff9f5a", "#b23a48"],
    css: "sepia(0.25) saturate(1.45) contrast(1.08) hue-rotate(-8deg)",
    p: { ...base, exposure: 1.02, contrast: 1.1, saturation: 1.35, warmth: 20, tint: 6, fade: 0.03, shadows: [14, -4, 4], highlights: [16, 6, -14], grain: 12, vignette: 0.35 },
  },
  {
    id: "teduh",
    name: { id: "Teduh", en: "Shade" },
    note: { id: "Sejuk, pudar, bayangan kehijauan", en: "Cool, faded, green shadows" },
    swatch: ["#9ec5b8", "#4d6f7a"],
    css: "saturate(0.8) contrast(0.9) brightness(1.04) hue-rotate(10deg)",
    p: { ...base, exposure: 1.03, contrast: 0.9, saturation: 0.82, warmth: -10, tint: -6, fade: 0.12, shadows: [-6, 10, 8], highlights: [4, 4, 0], grain: 14, vignette: 0.2 },
  },
  {
    id: "kopi",
    name: { id: "Kopi", en: "Coffee" },
    note: { id: "Cokelat klasik, nuansa album lama", en: "Classic brown, old-album feel" },
    swatch: ["#c9a27e", "#5b3a29"],
    css: "sepia(0.45) saturate(0.85) contrast(1.02)",
    p: { ...base, contrast: 1.02, saturation: 0.7, warmth: 18, fade: 0.1, shadows: [16, 6, -8], highlights: [14, 8, -12], grain: 18, vignette: 0.4 },
  },
  {
    id: "arang",
    name: { id: "Arang", en: "Charcoal" },
    note: { id: "Hitam putih tegas, berbutir", en: "Punchy black & white, grainy" },
    swatch: ["#d8d8d8", "#1b1b1b"],
    css: "grayscale(1) contrast(1.35) brightness(1.02)",
    p: { ...base, contrast: 1.35, mono: true, grain: 26, vignette: 0.35 },
  },
  {
    id: "kabut",
    name: { id: "Kabut", en: "Mist" },
    note: { id: "Hitam putih lembut dan pudar", en: "Soft, faded black & white" },
    swatch: ["#ece7df", "#7c766e"],
    css: "grayscale(1) sepia(0.12) contrast(0.85) brightness(1.08)",
    p: { ...base, exposure: 1.06, contrast: 0.85, mono: true, fade: 0.14, shadows: [4, 2, 0], highlights: [6, 4, 0], grain: 16, vignette: 0.15 },
  },
  {
    id: "polos",
    name: { id: "Polos", en: "Natural" },
    note: { id: "Tanpa filter, apa adanya", en: "No filter, just as it is" },
    swatch: ["#cfd8e3", "#7a8ca3"],
    css: "none",
    p: { ...base },
  },
];

export const getLook = (id: string) => LOOKS.find((l) => l.id === id) ?? LOOKS[0];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function applyLook(data: ImageData, look: Look) {
  const p = look.p;
  if (look.id === "polos") return;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let x = (i / 255) * p.exposure;
    x = (x - 0.5) * p.contrast + 0.5;
    x = p.fade + x * (1 - p.fade);
    lut[i] = clamp(x * 255);
  }
  const d = data.data;
  const w = data.width;
  const h = data.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = lut[d[i]];
      let g = lut[d[i + 1]];
      let b = lut[d[i + 2]];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (p.mono) {
        r = g = b = lum;
      } else if (p.saturation !== 1) {
        r = lum + (r - lum) * p.saturation;
        g = lum + (g - lum) * p.saturation;
        b = lum + (b - lum) * p.saturation;
      }
      const l = lum / 255;
      const sh = (1 - l) * (1 - l);
      const hi = l * l;
      r += p.warmth + sh * p.shadows[0] + hi * p.highlights[0] + p.tint * 0.5;
      g += sh * p.shadows[1] + hi * p.highlights[1] - p.tint;
      b += -p.warmth + sh * p.shadows[2] + hi * p.highlights[2] + p.tint * 0.5;
      if (p.grain) {
        const n = (Math.random() - 0.5) * p.grain;
        r += n;
        g += n;
        b += n;
      }
      if (p.vignette) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxD;
        const v = 1 - p.vignette * dist * dist;
        r *= v;
        g *= v;
        b *= v;
      }
      d[i] = clamp(r);
      d[i + 1] = clamp(g);
      d[i + 2] = clamp(b);
    }
  }
}

/** Draws the orange date stamp in the bottom-right corner, like a pocket film camera. */
export function drawDateStamp(ctx: CanvasRenderingContext2D, w: number, h: number, date = new Date()) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const text = `'${yy}  ${mm}  ${dd}`;
  const size = Math.round(Math.min(w, h) * 0.045);
  ctx.save();
  ctx.font = `700 ${size}px "Courier New", ui-monospace, monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(255,120,30,0.9)";
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = "#ffb15c";
  ctx.globalAlpha = 0.92;
  ctx.fillText(text, w - size * 1.2, h - size * 1.1);
  ctx.restore();
}
