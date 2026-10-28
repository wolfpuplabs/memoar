import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";
import { isAdmin } from "@/lib/auth";
import { limitByClient } from "@/lib/guard";
import { manualAvailable, manualConfig, manualOrderFor } from "@/lib/manual-qris";

export const runtime = "nodejs";

/** Host only: opens (or reuses) a manual QRIS order with a unique amount. */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const ev = await getEventBySlug((await ctx.params).slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await isAdmin(ev))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (ev.downloadsUnlocked) return NextResponse.json({ unlocked: true });
  if (!manualAvailable(ev)) return NextResponse.json({ error: "manual_off" }, { status: 409 });
  const limited = await limitByClient(req, "pay-manual", 10, 600);
  if (limited) return limited;
  const c = manualConfig();
  try {
    const order = await manualOrderFor(ev);
    return NextResponse.json({ ...order, options: c.options });
  } catch {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  }
}
