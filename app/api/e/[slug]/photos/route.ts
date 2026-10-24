import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";
import { getEventBySlug, isOpen, isRevealed, listPhotos, previewOnly } from "@/lib/events";
import { canDownload } from "@/lib/payments";
import { currentGuest, isAdmin } from "@/lib/auth";
import { randomId } from "@/lib/ids";
import { deleteFiles, saveFile } from "@/lib/storage";
import { isJpeg, limitByClient, track } from "@/lib/guard";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ slug: string }> };

const MAX_FULL = 4 * 1024 * 1024; // keep under the 4.5 MB serverless body limit
const MAX_THUMB = 400 * 1024;

/** Uploads one developed shot (full JPEG + thumbnail) for the current guest. */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const ev = await getEventBySlug(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const guest = await currentGuest(ev);
  if (!guest) return NextResponse.json({ error: "not_joined" }, { status: 401 });
  if (!isOpen(ev)) return NextResponse.json({ error: "ended" }, { status: 403 });

  const form = await req.formData();
  const full = form.get("full");
  const thumb = form.get("thumb");
  const source = form.get("source") === "upload" ? "upload" : "camera";
  if (source === "upload" && !ev.allowUploads) return NextResponse.json({ error: "uploads_off" }, { status: 403 });
  if (!(full instanceof Blob) || !(thumb instanceof Blob) || !full.size || !thumb.size) {
    return NextResponse.json({ error: "file" }, { status: 400 });
  }
  if (full.size > MAX_FULL || thumb.size > MAX_THUMB) return NextResponse.json({ error: "too_big" }, { status: 413 });
  if (!(await isJpeg(full)) || !(await isJpeg(thumb))) return NextResponse.json({ error: "file" }, { status: 415 });
  const limited = await limitByClient(req, "upload", 240, 600);
  if (limited) return limited;

  // Reserve the exposure first: the row lock makes parallel uploads queue up,
  // so a guest can never go past the roll.
  const reserved = await one<{ shots: number }>(
    `update guests set shots = coalesce(shots, 0) + 1 where id = $1 and coalesce(shots, 0) < $2 returning shots`,
    [guest.id, ev.shotsPerGuest],
  );
  if (!reserved) return NextResponse.json({ error: "roll_done", used: ev.shotsPerGuest }, { status: 403 });
  const release = () => query(`update guests set shots = greatest(coalesce(shots, 1) - 1, 0) where id = $1`, [guest.id]);

  const folder = `events/${ev.id}`;
  const saved = await Promise.allSettled([
    saveFile(folder, "jpg", full, "image/jpeg"),
    saveFile(`${folder}/thumbs`, "jpg", thumb, "image/jpeg"),
  ]);
  const ok = saved.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (ok.length < 2) {
    await Promise.all([release(), deleteFiles(ok.map((x) => x.url)).catch(() => {})]);
    return NextResponse.json({ error: "storage" }, { status: 503 });
  }
  const [f, t] = ok;
  const after = Number(reserved.shots) - 1;

  const id = randomId(12);
  try {
    await query(
      `insert into photos (id, event_id, guest_id, guest_name, url, thumb_url, pathname, thumb_pathname, width, height, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        ev.id,
        guest.id,
        guest.name,
        f.url,
        t.url,
        f.pathname,
        t.pathname,
        Number(form.get("width")) || null,
        Number(form.get("height")) || null,
        source,
      ],
    );
  } catch (err) {
    await Promise.all([release(), deleteFiles([f.url, t.url]).catch(() => {})]);
    throw err;
  }
  await track("photo", ev.id, 0, full.size + thumb.size);
  const revealed = isRevealed(ev);
  return NextResponse.json({
    ok: true,
    used: after + 1,
    left: Math.max(0, ev.shotsPerGuest - after - 1),
    photo: revealed ? { id, thumbUrl: t.url } : { id },
  });
}

/** Lists photos the visitor is allowed to see. Used to refresh the album after the reveal. */
export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const ev = await getEventBySlug(slug);
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const admin = await isAdmin(ev);
  const revealed = isRevealed(ev);
  if (admin || (revealed && ev.visibility === "everyone")) {
    return NextResponse.json({
      revealed,
      photos: previewOnly(await listPhotos(ev.id, { includeHidden: admin }), await canDownload(ev)),
    });
  }
  const guest = await currentGuest(ev);
  const mine = guest ? await one<{ n: number }>(`select count(*)::int as n from photos where guest_id = $1`, [guest.id]) : null;
  return NextResponse.json({ revealed, photos: [], mine: Number(mine?.n ?? 0) });
}
