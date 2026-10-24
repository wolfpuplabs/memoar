import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { limitByClient, track } from "@/lib/guard";
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

  // a whole party often shares one Wi-Fi address, so the per-address limit is generous
  const limited = await limitByClient(req, "join", 120, 600, ev.id);
  if (limited) return limited;

  const id = randomId(14);
  const token = randomToken();
  // the guest limit is what the host paid for: check and insert in one statement
  const inserted = await query(
    `insert into guests (id, event_id, name, token_hash, shots)
     select $1, $2, $3, $4, 0
      where (select count(*) from guests where event_id = $2) < $5
     returning id`,
    [id, ev.id, clean, hashToken(token), ev.maxGuests]
  );
  if (!inserted.length) return NextResponse.json({ error: "full" }, { status: 403 });
  await track("joined", ev.id);
  await setGuestCookie(ev.id, token);
  return NextResponse.json({ ok: true, guest: { id, name: clean } });
}
