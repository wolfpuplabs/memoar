import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";
import { isAdmin } from "@/lib/auth";
import { limitByClient } from "@/lib/guard";
import { siteOrigin } from "@/lib/i18n-server";
import { canDownload, createPayment, getPayment, payConfig, refreshFromMidtrans, type Scope } from "@/lib/payments";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ slug: string }> };

/** Starts a Snap payment. Body: { scope: "event" | "person" }. */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const ev = await getEventBySlug(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!payConfig().enabled) return NextResponse.json({ unlocked: true });
  if (ev.downloadsUnlocked) return NextResponse.json({ unlocked: true });
  const limited = await limitByClient(req, "pay", 15, 600);
  if (limited) return limited;

  const { scope } = (await req.json().catch(() => ({}))) as { scope?: Scope };
  const admin = await isAdmin(ev);
  if (scope === "event" && !admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (scope !== "event" && scope !== "person") return NextResponse.json({ error: "scope" }, { status: 400 });
  if (scope === "person" && (await canDownload(ev))) return NextResponse.json({ unlocked: true });

  const returnPath = scope === "event" ? `/kelola/${ev.slug}` : `/e/${ev.slug}/album`;
  try {
    const p = await createPayment(ev, scope, await siteOrigin(), returnPath);
    return NextResponse.json({ orderId: p.orderId, token: p.token, redirectUrl: p.redirectUrl, amount: p.amount });
  } catch {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
}

/** Polls a payment: GET ?order=ORDER_ID. Checks Midtrans directly while still pending. */
export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const ev = await getEventBySlug(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const limited = await limitByClient(req, "pay-poll", 200, 600);
  if (limited) return limited;
  const orderId = new URL(req.url).searchParams.get("order") || "";
  let pay = orderId ? await getPayment(orderId, ev.id) : null;
  if (pay && pay.status === "pending" && payConfig().enabled) {
    await refreshFromMidtrans(pay.order_id).catch(() => null);
    pay = await getPayment(orderId, ev.id);
  }
  const fresh = await getEventBySlug(slug);
  return NextResponse.json({
    status: pay?.status ?? "unknown",
    scope: pay?.scope ?? null,
    unlocked: fresh ? await canDownload(fresh) : false,
    eventUnlocked: !!fresh?.downloadsUnlocked,
  });
}
