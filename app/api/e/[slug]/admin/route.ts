import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, clearEventCookies } from "@/lib/auth";
import { deleteFiles } from "@/lib/storage";
import { LOOKS } from "@/lib/filters";
import {
  MAX_GUESTS_LIMIT,
  MAX_SHOTS,
  REVEAL_MODES,
  VISIBILITY,
  computeRevealAt,
  type RevealMode,
} from "@/lib/events";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ slug: string }> };

const clampInt = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const { ev, ok } = await requireAdmin(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  if (body.action === "reveal_now") {
    await query(`update events set reveal_at = now() where id = $1`, [ev.id]);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "close_now") {
    await query(`update events set ends_at = now(), reveal_at = least(reveal_at, now() + (reveal_at - ends_at)) where id = $1`, [ev.id]);
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : ev.name;
  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date(ev.startsAt);
  const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(ev.endsAt);
  if (isNaN(+startsAt) || isNaN(+endsAt) || endsAt <= startsAt) {
    return NextResponse.json({ error: "dates" }, { status: 400 });
  }
  const revealMode: RevealMode = REVEAL_MODES.includes(body.revealMode) ? body.revealMode : ev.revealMode;
  const delay = clampInt(body.revealDelayHours ?? ev.revealDelayHours, 1, 72, 12);
  const revealAt = computeRevealAt(revealMode, startsAt, endsAt, revealMode === "delayed" ? delay : 0);

  await query(
    `update events set name=$2, host_name=$3, message=$4, starts_at=$5, ends_at=$6, reveal_mode=$7,
       reveal_delay_hours=$8, reveal_at=$9, filter=$10, date_stamp=$11, shots_per_guest=$12,
       max_guests=$13, visibility=$14, allow_uploads=$15, guest_looks=$16
     where id=$1`,
    [
      ev.id,
      name,
      typeof body.hostName === "string" ? body.hostName.trim().slice(0, 80) || null : ev.hostName,
      typeof body.message === "string" ? body.message.trim().slice(0, 240) || null : ev.message,
      startsAt.toISOString(),
      endsAt.toISOString(),
      revealMode,
      revealMode === "delayed" ? delay : 0,
      revealAt.toISOString(),
      LOOKS.some((l) => l.id === body.filter) ? body.filter : ev.filter,
      typeof body.dateStamp === "boolean" ? body.dateStamp : ev.dateStamp,
      clampInt(body.shotsPerGuest ?? ev.shotsPerGuest, 5, MAX_SHOTS, ev.shotsPerGuest),
      clampInt(body.maxGuests ?? ev.maxGuests, 1, MAX_GUESTS_LIMIT, ev.maxGuests),
      VISIBILITY.includes(body.visibility) ? body.visibility : ev.visibility,
      typeof body.allowUploads === "boolean" ? body.allowUploads : ev.allowUploads,
      typeof body.guestLooks === "boolean" ? body.guestLooks : ev.guestLooks,
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const { ev, ok } = await requireAdmin(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const photos = await query<{ url: string; thumb_url: string }>(`select url, thumb_url from photos where event_id = $1`, [ev.id]);
  await deleteFiles([...photos.flatMap((p) => [p.url, p.thumb_url]), ev.coverUrl]);
  await query(`delete from events where id = $1`, [ev.id]);
  await clearEventCookies(ev.id);
  return NextResponse.json({ ok: true });
}
