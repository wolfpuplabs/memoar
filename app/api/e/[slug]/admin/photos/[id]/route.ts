import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteFiles } from "@/lib/storage";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ slug: string; id: string }> };

async function guard(ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const { ev, ok } = await requireAdmin(slug);
  if (!ev) return { res: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (!ok) return { res: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const photo = await one<{ id: string; url: string; thumb_url: string }>(
    `select id, url, thumb_url from photos where id = $1 and event_id = $2`,
    [id, ev.id]
  );
  if (!photo) return { res: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  return { photo };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const { hidden } = await req.json().catch(() => ({}));
  await query(`update photos set hidden = $2 where id = $1`, [g.photo!.id, !!hidden]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  await deleteFiles([g.photo!.url, g.photo!.thumb_url]);
  await query(`delete from photos where id = $1`, [g.photo!.id]);
  return NextResponse.json({ ok: true });
}
