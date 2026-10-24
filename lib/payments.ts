import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { one, query } from "./db";
import { hashToken, randomId, randomToken } from "./ids";
import type { EventData } from "./events";

/**
 * Album downloads are paid through Midtrans Snap (GoPay + QRIS).
 *  - scope "event":  the host unlocks full-resolution downloads for everyone.
 *  - scope "person": one visitor unlocks downloads for themselves (per device).
 * When Midtrans keys are not configured, the paywall is off and downloads are free.
 */

export type Scope = "event" | "person";

export function payConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const clientKey = process.env.MIDTRANS_CLIENT_KEY || "";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const snapHost = isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
  const apiHost = isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
  const int = (v: string | undefined, d: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 1000 ? n : d;
  };
  return {
    enabled: !!serverKey && !!clientKey,
    serverKey,
    clientKey,
    isProduction,
    snapUrl: process.env.MIDTRANS_SNAP_URL || `${snapHost}/snap/v1/transactions`,
    apiUrl: process.env.MIDTRANS_API_URL || apiHost,
    snapJs: `${snapHost}/snap/snap.js`,
    priceEvent: int(process.env.PRICE_UNLOCK_EVENT, 49000),
    pricePerson: int(process.env.PRICE_UNLOCK_PERSON, 15000),
    freeDownloads: (() => {
      const n = Math.round(Number(process.env.FREE_DOWNLOADS_PER_PERSON ?? 10));
      return Number.isFinite(n) && n >= 0 ? Math.min(n, 500) : 10;
    })(),
  };
}

/** What the browser needs to show the paywall (no secrets). */
export function publicPayConfig() {
  const c = payConfig();
  return { enabled: c.enabled, clientKey: c.clientKey, snapJs: c.snapJs, priceEvent: c.priceEvent, pricePerson: c.pricePerson, freeDownloads: c.freeDownloads };
}
export type PublicPayConfig = ReturnType<typeof publicPayConfig>;

const buyerCookie = (eventId: string) => `mb_${eventId}`;

async function buyerHash(ev: EventData, create: boolean) {
  const jar = await cookies();
  let token = jar.get(buyerCookie(ev.id))?.value;
  if (!token && create) {
    token = randomToken();
    jar.set(buyerCookie(ev.id), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return token ? hashToken(token) : null;
}

/** True when this visitor may download full-resolution files for the event. */
export async function canDownload(ev: EventData) {
  if (!payConfig().enabled || ev.downloadsUnlocked) return true;
  const h = await buyerHash(ev, false);
  if (!h) return false;
  const row = await one(
    `select 1 as x from payments where event_id = $1 and buyer_hash = $2 and scope = 'person' and status = 'paid' limit 1`,
    [ev.id, h]
  );
  return !!row;
}

const auth = (serverKey: string) => "Basic " + Buffer.from(`${serverKey}:`).toString("base64");

export async function createPayment(ev: EventData, scope: Scope, origin: string, returnPath: string) {
  const c = payConfig();
  const amount = scope === "event" ? c.priceEvent : c.pricePerson;
  const h = scope === "person" ? await buyerHash(ev, true) : null;
  const orderId = `MMR-${ev.id.slice(0, 8)}-${randomId(10)}`.toUpperCase();
  await query(
    `insert into payments (order_id, event_id, scope, buyer_hash, amount) values ($1,$2,$3,$4,$5)`,
    [orderId, ev.id, scope, h, amount]
  );

  const itemName = (scope === "event" ? `Album unlock · ${ev.name}` : `Album download · ${ev.name}`).slice(0, 50);
  const finish = `${origin}${returnPath}${returnPath.includes("?") ? "&" : "?"}order=${encodeURIComponent(orderId)}`;
  const res = await fetch(c.snapUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: auth(c.serverKey) },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [{ id: `memoar-${scope}`, price: amount, quantity: 1, name: itemName }],
      enabled_payments: ["gopay", "other_qris"],
      callbacks: { finish },
      expiry: { unit: "minutes", duration: 30 },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { token?: string; redirect_url?: string; error_messages?: string[] };
  if (!res.ok || !data.token) {
    await query(`update payments set status = 'failed' where order_id = $1`, [orderId]);
    console.error("midtrans snap error", res.status, data.error_messages);
    throw new Error("snap");
  }
  await query(`update payments set snap_token = $2 where order_id = $1`, [orderId, data.token]);
  return { orderId, token: data.token, redirectUrl: data.redirect_url ?? null, amount };
}

type MidtransStatus = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  signature_key?: string;
};

export function verifySignature(n: MidtransStatus) {
  const { serverKey } = payConfig();
  if (!serverKey || !n.signature_key || !n.order_id) return false;
  const expected = createHash("sha512")
    .update(`${n.order_id}${n.status_code ?? ""}${n.gross_amount ?? ""}${serverKey}`)
    .digest("hex");
  return expected === n.signature_key;
}

function mapStatus(n: MidtransStatus): "paid" | "pending" | "failed" | "refunded" {
  const ts = (n.transaction_status || "").toLowerCase();
  const fraud = (n.fraud_status || "accept").toLowerCase();
  if ((ts === "settlement" || ts === "capture") && fraud === "accept") return "paid";
  if (ts === "pending" || (ts === "capture" && fraud === "challenge")) return "pending";
  if (ts === "refund" || ts === "partial_refund" || ts === "chargeback" || ts === "partial_chargeback") return "refunded";
  return "failed";
}

/** Applies a Midtrans status (from the webhook or the status API) to our records. */
export async function applyStatus(n: MidtransStatus) {
  if (!n.order_id) return null;
  const pay = await one<{ order_id: string; event_id: string; scope: Scope; amount: number; status: string }>(
    `select order_id, event_id, scope, amount, status from payments where order_id = $1`,
    [n.order_id]
  );
  if (!pay) return null;
  let status = mapStatus(n);
  // never trust an amount that differs from what we charged
  if (status === "paid" && Math.round(Number(n.gross_amount)) !== Number(pay.amount)) status = "failed";
  if (pay.status === "paid" && status !== "refunded") return { ...pay, status: "paid" };

  await query(
    `update payments set status = $2, payment_type = coalesce($3, payment_type), paid_at = case when $2 = 'paid' then now() else paid_at end where order_id = $1`,
    [pay.order_id, status, n.payment_type ?? null]
  );
  if (pay.scope === "event") {
    if (status === "paid") await query(`update events set downloads_unlocked = true where id = $1`, [pay.event_id]);
    if (status === "refunded") await query(`update events set downloads_unlocked = false where id = $1`, [pay.event_id]);
  }
  return { ...pay, status };
}

/** Asks Midtrans directly — covers a missed or slow webhook. */
export async function refreshFromMidtrans(orderId: string) {
  const c = payConfig();
  const res = await fetch(`${c.apiUrl}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { accept: "application/json", authorization: auth(c.serverKey) },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as MidtransStatus | null;
  if (!data || data.status_code === "404") return null;
  return applyStatus({ ...data, order_id: orderId });
}

export async function getPayment(orderId: string, eventId: string) {
  return one<{ order_id: string; scope: Scope; status: string }>(
    `select order_id, scope, status from payments where order_id = $1 and event_id = $2`,
    [orderId, eventId]
  );
}

/**
 * Before rendering the album or dashboard: re-check this visitor's recent
 * pending payments with Midtrans, so a page reload unlocks downloads even if
 * the webhook never arrived and the payment tab was closed.
 */
export async function reconcilePending(ev: EventData, admin: boolean) {
  if (!payConfig().enabled || ev.downloadsUnlocked) return;
  const h = await buyerHash(ev, false);
  const rows = await query<{ order_id: string }>(
    `select order_id from payments
      where event_id = $1 and status = 'pending' and created_at > now() - interval '6 hours'
        and ((scope = 'event' and $2::boolean) or (scope = 'person' and buyer_hash = $3))
      order by created_at desc limit 3`,
    [ev.id, admin, h]
  );
  await Promise.all(rows.map((r) => refreshFromMidtrans(r.order_id).catch(() => null)));
}

/**
 * Free quota: every visitor may download a few photos per album before paying.
 * Tracked per photo, so downloading the same photo again never uses quota.
 */
export async function freeDownloadState(ev: EventData) {
  const quota = payConfig().freeDownloads;
  const h = await buyerHash(ev, false);
  if (!h || quota === 0) return { quota, used: [] as string[], left: quota };
  const rows = await query<{ photo_id: string }>(
    `select photo_id from free_downloads where event_id = $1 and buyer_hash = $2`,
    [ev.id, h]
  );
  const used = rows.map((r) => r.photo_id);
  return { quota, used, left: Math.max(0, quota - used.length) };
}

/** Records a free download of one photo if quota remains. Returns true when allowed. */
export async function claimFreeDownload(ev: EventData, photoId: string) {
  const quota = payConfig().freeDownloads;
  if (quota === 0) return false;
  const h = await buyerHash(ev, true);
  if (!h) return false;
  await query(
    `insert into free_downloads (event_id, buyer_hash, photo_id)
     select $1, $2, $3
      where (select count(*) from free_downloads where event_id = $1 and buyer_hash = $2) < $4
     on conflict do nothing`,
    [ev.id, h, photoId, quota]
  );
  const ok = await one(
    `select 1 as x from free_downloads where event_id = $1 and buyer_hash = $2 and photo_id = $3`,
    [ev.id, h, photoId]
  );
  return !!ok;
}
