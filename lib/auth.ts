import "server-only";
import { cookies } from "next/headers";
import { one } from "./db";
import { hashToken, safeEqualHex } from "./ids";
import { getEventBySlug, type EventData } from "./events";

const YEAR = 60 * 60 * 24 * 365;
const adminCookie = (eventId: string) => `ma_${eventId}`;
const guestCookie = (eventId: string) => `mg_${eventId}`;

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: YEAR,
};

export async function setAdminCookie(eventId: string, token: string) {
  (await cookies()).set(adminCookie(eventId), token, cookieOpts);
}

export async function setGuestCookie(eventId: string, token: string) {
  (await cookies()).set(guestCookie(eventId), token, cookieOpts);
}

export async function clearEventCookies(eventId: string) {
  const c = await cookies();
  c.delete(adminCookie(eventId));
  c.delete(guestCookie(eventId));
}

export async function verifyAdminToken(ev: EventData, token: string | undefined | null) {
  if (!token) return false;
  const row = await one<{ admin_hash: string }>(`select admin_hash from events where id = $1`, [ev.id]);
  return !!row && safeEqualHex(row.admin_hash, hashToken(token));
}

export async function isAdmin(ev: EventData) {
  const token = (await cookies()).get(adminCookie(ev.id))?.value;
  return verifyAdminToken(ev, token);
}

/** Returns the raw admin token from the cookie when valid, so the host link can be shown again. */
export async function adminToken(ev: EventData) {
  const token = (await cookies()).get(adminCookie(ev.id))?.value;
  return (await verifyAdminToken(ev, token)) ? token! : null;
}

/** Loads an event and requires the visitor to hold its admin cookie. */
export async function requireAdmin(slug: string) {
  const ev = await getEventBySlug(slug);
  if (!ev) return { ev: null, ok: false as const };
  return { ev, ok: await isAdmin(ev) };
}

export async function currentGuest(ev: EventData): Promise<{ id: string; name: string } | null> {
  const token = (await cookies()).get(guestCookie(ev.id))?.value;
  if (!token) return null;
  return one<{ id: string; name: string }>(
    `select id, name from guests where event_id = $1 and token_hash = $2`,
    [ev.id, hashToken(token)]
  );
}
