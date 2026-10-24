import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { getEventBySlug, isRevealed } from "@/lib/events";
import { currentGuest, isAdmin } from "@/lib/auth";
import { readFile } from "@/lib/storage";
import { canDownload } from "@/lib/payments";

export const runtime = "nodejs";

/** Same-origin download proxy so the browser can bundle photos into a ZIP. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await ctx.params;
  const ev = await getEventBySlug(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const photo = await one<{ url: string; guest_id: string | null; hidden: boolean }>(
    `select url, guest_id, hidden from photos where id = $1 and event_id = $2`,
    [id, ev.id]
  );
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let allowed = await isAdmin(ev);
  if (!allowed && !photo.hidden && isRevealed(ev)) {
    if (ev.visibility === "everyone") allowed = true;
    else {
      const g = await currentGuest(ev);
      allowed = !!g && g.id === photo.guest_id;
    }
  }
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await canDownload(ev))) return NextResponse.json({ error: "payment_required" }, { status: 402 });

  const file = await readFile(photo.url);
  if (!file) return NextResponse.json({ error: "missing" }, { status: 404 });
  return new NextResponse(file.body, {
    headers: {
      "content-type": file.type,
      "cache-control": "private, max-age=3600",
      "content-disposition": `attachment; filename="memoar-${id}.jpg"`,
    },
  });
}
