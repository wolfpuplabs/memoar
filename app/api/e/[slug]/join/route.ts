import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";
import { getEventBySlug, isOpen } from "@/lib/events";
import { currentGuest, setGuestCookie } from "@/lib/auth";
import { hashToken, randomId, randomToken } from "@/lib/ids";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const ev = await getEventBySlug(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await currentGuest(ev);
  if (existing) return NextResponse.json({ ok: true, guest: existing });

  if (!isOpen(ev)) return NextResponse.json({ error: "ended" }, { status: 403 });

  const { name } = await req.json().catch(() => ({ name: "" }));
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  if (!clean) return NextResponse.json({ error: "name" }, { status: 400 });

  const count = await one<{ n: number }>(`select count(*)::int as n from guests where event_id = $1`, [ev.id]);
  if (Number(count?.n ?? 0) >= ev.maxGuests) return NextResponse.json({ error: "full" }, { status: 403 });

  const id = randomId(14);
  const token = randomToken();
  await query(`insert into guests (id, event_id, name, token_hash) values ($1, $2, $3, $4)`, [
    id,
    ev.id,
    clean,
    hashToken(token),
  ]);
  await setGuestCookie(ev.id, token);
  return NextResponse.json({ ok: true, guest: { id, name: clean } });
}
