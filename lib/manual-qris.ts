import "server-only";
import { one, query } from "./db";
import { randomId } from "./ids";
import { applyStatus } from "./payments";
import type { EventData } from "./events";

/**
 * Manual QRIS for host packages: the host scans the merchant's static QRIS
 * and pays an amount with a unique 3-digit code, the operator matches it in
 * the bank mutation list and confirms it on /ops. No webhook exists for a
 * static QRIS, so nothing here is confirmed automatically.
 *
 * MANUAL_QRIS      static QRIS payloads (the text inside each QR code), one per line or "|"-separated
 * MANUAL_QRIS_MIN  smallest package price that may use it (default Rp 499.000; 1 = every paid package)
 */

export const MANUAL_PREFIX = "MQ-";
const PENDING_DAYS = 3;

function crc16(s: string) {
  let c = 0xffff;
  for (const b of Buffer.from(s, "utf8")) {
    c ^= b << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}

/** Reads top-level EMV tags (id, length, value). */
function emvTag(payload: string, id: string) {
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) return null;
    if (tag === id) return payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return null;
}

/** A friendly name for the QRIS issuer from tag 26's reverse-domain id (ID.DANA.WWW → DANA). */
function issuer(payload: string) {
  const acc = emvTag(payload, "26");
  const gui = acc ? emvTag(acc, "00") : null;
  if (!gui) return "";
  const known: Record<string, string> = { DANA: "DANA", SPEEDCASH: "SpeedCash", GOPAY: "GoPay", OVO: "OVO", SHOPEEPAY: "ShopeePay", LINKAJA: "LinkAja" };
  const parts = gui.toUpperCase().split(".").filter((x) => !["ID", "CO", "WWW", "MERCHANT", "COM"].includes(x));
  return parts.map((x) => known[x] ?? x.charAt(0) + x.slice(1).toLowerCase()).join(" ");
}

export type QrisOption = { payload: string; merchant: string; issuer: string };

export function manualConfig() {
  // one or more static QRIS payloads, separated by new lines, spaces or "|"
  const raw = (process.env.MANUAL_QRIS || "").split(/[\s|]+/).filter(Boolean);
  const options: QrisOption[] = [];
  for (const payload of raw) {
    const ok = payload.length > 20 && payload.slice(-4).toUpperCase() === crc16(payload.slice(0, -4));
    if (!ok) {
      console.error("MANUAL_QRIS: a payload has a wrong CRC and is skipped");
      continue;
    }
    options.push({ payload, merchant: emvTag(payload, "59") ?? "", issuer: issuer(payload) });
  }
  const min = Math.round(Number(process.env.MANUAL_QRIS_MIN ?? 499000));
  return { enabled: options.length > 0, options, min: Number.isFinite(min) && min > 0 ? min : 499000 };
}

export const manualAvailable = (ev: EventData) => {
  const c = manualConfig();
  return c.enabled && ev.packagePrice >= c.min && !ev.downloadsUnlocked;
};

export type ManualOrder = { orderId: string; amount: number; status: string; createdAt: string };

/** Returns this event's open manual order, or creates one with a unique amount. */
export async function manualOrderFor(ev: EventData): Promise<ManualOrder> {
  const open = await one<{ order_id: string; amount: number; status: string; created_at: string }>(
    `select order_id, amount, status, created_at from payments
      where event_id = $1 and payment_type = 'manual_qris' and status = 'pending'
        and created_at > now() - ($2 || ' days')::interval
      order by created_at desc limit 1`,
    [ev.id, String(PENDING_DAYS)]
  );
  if (open) return { orderId: open.order_id, amount: Number(open.amount), status: open.status, createdAt: new Date(open.created_at).toISOString() };

  // unique code 1..999 among every open manual order, so a mutation matches exactly one order
  const taken = new Set(
    (
      await query<{ amount: number }>(
        `select amount from payments where payment_type = 'manual_qris' and status = 'pending'
          and created_at > now() - ($1 || ' days')::interval`,
        [String(PENDING_DAYS)]
      )
    ).map((r) => Number(r.amount))
  );
  let amount = 0;
  for (let tries = 0; tries < 50 && !amount; tries++) {
    const a = ev.packagePrice + 1 + Math.floor(Math.random() * 999);
    if (!taken.has(a)) amount = a;
  }
  if (!amount) throw new Error("manual_busy");
  const orderId = `${MANUAL_PREFIX}${ev.id.slice(0, 6)}-${randomId(6)}`.toUpperCase();
  await query(
    `insert into payments (order_id, event_id, scope, amount, payment_type) values ($1, $2, 'event', $3, 'manual_qris')`,
    [orderId, ev.id, amount]
  );
  return { orderId, amount, status: "pending", createdAt: new Date().toISOString() };
}

export type PendingManual = { orderId: string; amount: number; createdAt: string; eventName: string; slug: string };

export async function listPendingManual(): Promise<PendingManual[]> {
  const rows = await query<{ order_id: string; amount: number; created_at: string; name: string; slug: string }>(
    `select p.order_id, p.amount, p.created_at, e.name, e.slug
       from payments p join events e on e.id = p.event_id
      where p.payment_type = 'manual_qris' and p.status = 'pending'
        and p.created_at > now() - ($1 || ' days')::interval
      order by p.created_at asc`,
    [String(PENDING_DAYS)]
  );
  return rows.map((r) => ({
    orderId: r.order_id,
    amount: Number(r.amount),
    createdAt: new Date(r.created_at).toISOString(),
    eventName: r.name,
    slug: r.slug,
  }));
}

/** Operator decision from /ops: confirm unlocks the album through the normal payment path. */
export async function decideManual(orderId: string, approve: boolean) {
  const pay = await one<{ order_id: string; amount: number }>(
    `select order_id, amount from payments where order_id = $1 and payment_type = 'manual_qris' and status = 'pending'`,
    [orderId]
  );
  if (!pay) return false;
  if (!approve) {
    await query(`update payments set status = 'failed' where order_id = $1 and status = 'pending'`, [orderId]);
    return true;
  }
  await applyStatus({
    order_id: pay.order_id,
    transaction_status: "settlement",
    fraud_status: "accept",
    gross_amount: String(pay.amount),
    payment_type: "manual_qris",
  });
  return true;
}
