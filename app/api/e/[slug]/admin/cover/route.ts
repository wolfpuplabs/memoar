import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteFiles, saveFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const { ev, ok } = await requireAdmin(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("cover");
  if (!(file instanceof Blob) || !file.size) return NextResponse.json({ error: "file" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "cover_size" }, { status: 413 });
  const saved = await saveFile("covers", "jpg", file, "image/jpeg");
  await query(`update events set cover_url = $2, cover_pathname = $3 where id = $1`, [ev.id, saved.url, saved.pathname]);
  await deleteFiles([ev.coverUrl]);
  return NextResponse.json({ url: saved.url });
}
