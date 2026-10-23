import "server-only";
import { one, query } from "./db";

export const EVENT_KINDS = [
  "pernikahan",
  "lamaran",
  "ulangtahun",
  "pesta",
  "wisuda",
  "kantor",
  "lainnya",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const REVEAL_MODES = ["live", "end", "delayed"] as const;
export type RevealMode = (typeof REVEAL_MODES)[number];

export const VISIBILITY = ["everyone", "host"] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const MAX_GUESTS_LIMIT = Number(process.env.MAX_GUESTS_LIMIT || 300);
export const MAX_SHOTS = 50;

export type EventData = {
  id: string;
  slug: string;
  name: string;
  kind: EventKind;
  hostName: string | null;
  message: string | null;
  startsAt: string;
  endsAt: string;
  revealMode: RevealMode;
  revealDelayHours: number;
  revealAt: string;
  filter: string;
  dateStamp: boolean;
  shotsPerGuest: number;
  maxGuests: number;
  visibility: Visibility;
  allowUploads: boolean;
  coverUrl: string | null;
  coverPathname: string | null;
  createdAt: string;
};

export type PhotoData = {
  id: string;
  guestId: string | null;
  guestName: string | null;
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  source: string;
  hidden: boolean;
  createdAt: string;
};

export type GuestData = { id: string; name: string; createdAt: string; shots: number };

/* eslint-disable @typescript-eslint/no-explicit-any */
const iso = (v: any) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

export function mapEvent(r: any): EventData {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    hostName: r.host_name,
    message: r.message,
    startsAt: iso(r.starts_at),
    endsAt: iso(r.ends_at),
    revealMode: r.reveal_mode,
    revealDelayHours: Number(r.reveal_delay_hours),
    revealAt: iso(r.reveal_at),
    filter: r.filter,
    dateStamp: !!r.date_stamp,
    shotsPerGuest: Number(r.shots_per_guest),
    maxGuests: Number(r.max_guests),
    visibility: r.visibility,
    allowUploads: !!r.allow_uploads,
    coverUrl: r.cover_url,
    coverPathname: r.cover_pathname,
    createdAt: iso(r.created_at),
  };
}

export function mapPhoto(r: any): PhotoData {
  return {
    id: r.id,
    guestId: r.guest_id,
    guestName: r.guest_name,
    url: r.url,
    thumbUrl: r.thumb_url,
    width: r.width,
    height: r.height,
    source: r.source,
    hidden: !!r.hidden,
    createdAt: iso(r.created_at),
  };
}

export async function getEventBySlug(slug: string): Promise<EventData | null> {
  const r = await one(`select * from events where slug = $1`, [slug.toLowerCase()]);
  return r ? mapEvent(r) : null;
}

export async function getEventById(id: string): Promise<EventData | null> {
  const r = await one(`select * from events where id = $1`, [id]);
  return r ? mapEvent(r) : null;
}

export function computeRevealAt(mode: RevealMode, startsAt: Date, endsAt: Date, delayHours: number) {
  if (mode === "live") return new Date(Math.min(startsAt.getTime(), Date.now()));
  if (mode === "delayed") return new Date(endsAt.getTime() + delayHours * 3600_000);
  return endsAt;
}

export const isRevealed = (ev: EventData) => Date.now() >= new Date(ev.revealAt).getTime();
export const isOpen = (ev: EventData) => Date.now() < new Date(ev.endsAt).getTime();

const RESERVED = new Set([
  "api", "admin", "buat", "kelola", "e", "k", "cara-kerja", "login", "app", "www", "memoar",
]);

export function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return "slug_short";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "slug_chars";
  if (RESERVED.has(slug)) return "slug_taken";
  return null;
}

export async function slugAvailable(slug: string) {
  const r = await one(`select 1 as x from events where slug = $1`, [slug]);
  return !r;
}

export async function eventStats(eventId: string) {
  const [g] = await query<{ n: string }>(`select count(*)::int as n from guests where event_id = $1`, [eventId]);
  const [p] = await query<{ n: string }>(
    `select count(*)::int as n from photos where event_id = $1 and hidden = false`,
    [eventId]
  );
  return { guests: Number(g?.n ?? 0), photos: Number(p?.n ?? 0) };
}

export async function listPhotos(eventId: string, opts: { includeHidden?: boolean } = {}) {
  const rows = await query(
    `select * from photos where event_id = $1 ${opts.includeHidden ? "" : "and hidden = false"} order by created_at asc`,
    [eventId]
  );
  return rows.map(mapPhoto);
}

export async function listGuests(eventId: string): Promise<GuestData[]> {
  const rows = await query(
    `select g.id, g.name, g.created_at, count(p.id)::int as shots
       from guests g left join photos p on p.guest_id = g.id
      where g.event_id = $1
      group by g.id order by g.created_at asc`,
    [eventId]
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: iso(r.created_at), shots: Number(r.shots) }));
}

export async function guestShotCount(guestId: string) {
  const r = await one<{ n: number }>(`select count(*)::int as n from photos where guest_id = $1`, [guestId]);
  return Number(r?.n ?? 0);
}
