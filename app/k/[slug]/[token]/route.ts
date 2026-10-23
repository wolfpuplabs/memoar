import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";
import { setAdminCookie, verifyAdminToken } from "@/lib/auth";

export const runtime = "nodejs";

/** Host link: /k/<slug>/<token>. Verifies the token, stores it in a cookie, opens the dashboard. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await ctx.params;
  const ev = await getEventBySlug(slug);
  const url = new URL(req.url);
  if (ev && (await verifyAdminToken(ev, token))) {
    await setAdminCookie(ev.id, token);
    return NextResponse.redirect(new URL(`/kelola/${ev.slug}`, url.origin));
  }
  return NextResponse.redirect(new URL(`/kelola/${encodeURIComponent(slug)}`, url.origin));
}
