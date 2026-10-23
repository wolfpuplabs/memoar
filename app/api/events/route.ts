import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomId, randomToken, hashToken } from "@/lib/ids";
import { saveFile } from "@/lib/storage";
import { setAdminCookie } from "@/lib/auth";
import { LOOKS } from "@/lib/filters";
import {
  EVENT_KINDS,
  REVEAL_MODES,
  VISIBILITY,
  MAX_GUESTS_LIMIT,
  MAX_SHOTS,
  computeRevealAt,
  normalizeSlug,
  slugAvailable,
  slugProblem,
  type RevealMode,
} from "@/lib/events";

export const runtime = "nodejs";

const clampInt = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const data = JSON.parse(String(form.get("data") || "{}"));

    const name = str(data.name, 80);
    if (!name) return NextResponse.json({ error: "name" }, { status: 400 });

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (isNaN(+startsAt) || isNaN(+endsAt) || endsAt <= startsAt) {
      return NextResponse.json({ error: "dates" }, { status: 400 });
    }

    const kind = EVENT_KINDS.includes(data.kind) ? data.kind : "lainnya";
    const revealMode: RevealMode = REVEAL_MODES.includes(data.revealMode) ? data.revealMode : "end";
    const delay = clampInt(data.revealDelayHours, 1, 72, 12);
    const revealAt = computeRevealAt(revealMode, startsAt, endsAt, revealMode === "delayed" ? delay : 0);
    const filter = LOOKS.some((l) => l.id === data.filter) ? data.filter : LOOKS[0].id;
    const visibility = VISIBILITY.includes(data.visibility) ? data.visibility : "everyone";

    let slug = normalizeSlug(str(data.slug, 60));
    if (slug) {
      const problem = slugProblem(slug);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      if (!(await slugAvailable(slug))) return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    } else {
      const baseSlug = normalizeSlug(name).slice(0, 30) || "acara";
      do slug = `${baseSlug}-${randomId(4)}`;
      while (!(await slugAvailable(slug)));
    }

    let cover: { url: string; pathname: string } | null = null;
    const coverFile = form.get("cover");
    if (coverFile instanceof Blob && coverFile.size > 0) {
      if (coverFile.size > 4 * 1024 * 1024) return NextResponse.json({ error: "cover_size" }, { status: 413 });
      cover = await saveFile(`covers`, "jpg", coverFile, "image/jpeg");
    }

    const id = randomId(14);
    const adminToken = randomToken();
    await query(
      `insert into events (id, slug, name, kind, host_name, message, admin_hash, starts_at, ends_at,
        reveal_mode, reveal_delay_hours, reveal_at, filter, date_stamp, shots_per_guest, max_guests,
        visibility, allow_uploads, cover_url, cover_pathname)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        id,
        slug,
        name,
        kind,
        str(data.hostName, 80) || null,
        str(data.message, 240) || null,
        hashToken(adminToken),
        startsAt.toISOString(),
        endsAt.toISOString(),
        revealMode,
        revealMode === "delayed" ? delay : 0,
        revealAt.toISOString(),
        filter,
        data.dateStamp !== false,
        clampInt(data.shotsPerGuest, 5, MAX_SHOTS, 24),
        clampInt(data.maxGuests, 1, MAX_GUESTS_LIMIT, 50),
        visibility,
        data.allowUploads !== false,
        cover?.url ?? null,
        cover?.pathname ?? null,
      ]
    );
    await setAdminCookie(id, adminToken);
    return NextResponse.json({ slug });
  } catch (err) {
    console.error("create event", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
