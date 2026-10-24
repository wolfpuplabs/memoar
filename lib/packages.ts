/**
 * Event packages, sized by how many guests can join. The host's "unlock for
 * everyone" price is the package price; the free package is fully free.
 * Override prices with EVENT_PACKAGE_PRICES="intim:99000,pesta:249000,gala:499000".
 */
export type EventPackage = {
  id: "coba" | "intim" | "pesta" | "gala";
  guests: number;
  price: number;
  name: { id: string; en: string };
  note: { id: string; en: string };
};

const BASE: EventPackage[] = [
  { id: "coba", guests: 10, price: 0, name: { id: "Coba", en: "Try" }, note: { id: "Kumpul kecil, gratis penuh", en: "Small get-togethers, completely free" } },
  { id: "intim", guests: 50, price: 99000, name: { id: "Intim", en: "Intimate" }, note: { id: "Ulang tahun, lamaran, arisan", en: "Birthdays, engagements, small parties" } },
  { id: "pesta", guests: 150, price: 249000, name: { id: "Pesta", en: "Party" }, note: { id: "Pernikahan & acara kantor", en: "Weddings and company events" } },
  { id: "gala", guests: 300, price: 499000, name: { id: "Gala", en: "Gala" }, note: { id: "Resepsi besar & festival", en: "Big receptions and festivals" } },
];

export function eventPackages(): EventPackage[] {
  const raw = process.env.EVENT_PACKAGE_PRICES || "";
  const o = new Map<string, number>();
  for (const part of raw.split(",")) {
    const [k, v] = part.split(":").map((s) => s.trim());
    const n = Math.round(Number(v));
    if (k && k !== "coba" && Number.isFinite(n) && n >= 1000) o.set(k, n);
  }
  return BASE.map((p) => ({ ...p, price: o.get(p.id) ?? p.price }));
}

export const getEventPackage = (id: string | null | undefined) => eventPackages().find((p) => p.id === id) ?? null;

/** Smallest package that fits a guest limit (used for events made before packages existed). */
export const packageForGuests = (guests: number) =>
  eventPackages().find((p) => p.guests >= guests) ?? eventPackages()[eventPackages().length - 1];

export const DEFAULT_PACKAGE = "pesta";
