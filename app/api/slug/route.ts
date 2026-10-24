import { NextResponse } from "next/server";
import { limitByClient } from "@/lib/guard";
import { normalizeSlug, slugAvailable, slugProblem } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = await limitByClient(req, "slug", 60, 60);
  if (limited) return limited;
  const s = normalizeSlug(new URL(req.url).searchParams.get("s") || "");
  const problem = slugProblem(s);
  if (problem) return NextResponse.json({ slug: s, ok: false, reason: problem });
  const ok = await slugAvailable(s);
  return NextResponse.json({ slug: s, ok, reason: ok ? null : "slug_taken" });
}
