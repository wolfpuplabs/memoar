import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { deleteFiles } from "@/lib/storage";
import { hashToken, safeEqualHex } from "@/lib/ids";
import { pruneRateLimits } from "@/lib/guard";
import { RETENTION_DAYS } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH = 100; // blob deletions per call
const PAUSE_MS = 7000; // stays under the Hobby limit of 900 blob operations per minute
const BUDGET_MS = 240_000;

/**
 * Daily job (see vercel.json): deletes every event whose photos developed more
 * than RETENTION_DAYS ago, including all its photo files, guests and cover.
 * Large albums are removed in batches; anything left over continues next run.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = hashToken(req.headers.get("authorization") || "");
  if (!secret || !safeEqualHex(given, hashToken(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  await pruneRateLimits().catch(() => {});
  const expired = await query<{ id: string; cover_url: string | null }>(
    `select id, cover_url from events where reveal_at < now() - ($1 || ' days')::interval order by reveal_at asc`,
    [String(RETENTION_DAYS)]
  );

  let photosDeleted = 0;
  let eventsDeleted = 0;
  let first = true;

  for (const ev of expired) {
    while (Date.now() - started < BUDGET_MS) {
      const batch = await query<{ id: string; url: string; thumb_url: string }>(
        `select id, url, thumb_url from photos where event_id = $1 limit $2`,
        [ev.id, BATCH / 2]
      );
      if (!batch.length) break;
      if (!first) await new Promise((r) => setTimeout(r, PAUSE_MS));
      first = false;
      await deleteFiles(batch.flatMap((p) => [p.url, p.thumb_url]));
      await query(`delete from photos where id = any($1::text[])`, [batch.map((p) => p.id)]);
      photosDeleted += batch.length;
    }
    if (Date.now() - started >= BUDGET_MS) break;
    await deleteFiles([ev.cover_url]);
    await query(`delete from events where id = $1`, [ev.id]);
    eventsDeleted++;
  }

  const remaining = expired.length - eventsDeleted;
  console.log(`cleanup: ${eventsDeleted} events, ${photosDeleted} photos deleted, ${remaining} pending`);
  return NextResponse.json({ eventsDeleted, photosDeleted, pending: remaining });
}
