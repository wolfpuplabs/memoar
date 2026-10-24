import type { Metadata } from "next";
import Link from "next/link";
import { getEventBySlug, listGuests, listPhotos, MAX_GUESTS_LIMIT, previewOnly } from "@/lib/events";
import { adminToken } from "@/lib/auth";
import { getT, siteOrigin } from "@/lib/i18n-server";
import Dashboard from "./Dashboard";
import { eventPackages } from "@/lib/packages";
import { canDownload, freeDownloadState, publicPayConfig, reconcilePending } from "@/lib/payments";

export const metadata: Metadata = { title: "Manage event", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ baru?: string; order?: string }>;
}) {
  const { slug } = await params;
  const { baru, order } = await searchParams;
  const { t } = await getT();
  let ev = await getEventBySlug(slug);
  const token = ev ? await adminToken(ev) : null;
  if (ev && token) {
    await reconcilePending(ev, true).catch(() => null);
    ev = (await getEventBySlug(slug)) ?? ev;
  }

  if (!ev || !token) {
    return (
      <div className="center-page">
        <div>
          <h1>{ev ? t.admin.notAdminTitle : t.guest.notFound}</h1>
          <p className="muted">{ev ? t.admin.notAdminLead : t.guest.notFoundLead}</p>
          <Link href="/" className="btn btn-ghost" style={{ marginTop: 16 }}>← memoar</Link>
        </div>
      </div>
    );
  }

  const origin = await siteOrigin();
  const [photos, guests] = await Promise.all([listPhotos(ev.id, { includeHidden: true }), listGuests(ev.id)]);
  return (
    <Dashboard
      ev={ev}
      photos={previewOnly(photos, await canDownload(ev))}
      guests={guests}
      isNew={baru === "1"}
      guestUrl={`${origin}/e/${ev.slug}`}
      adminUrl={`${origin}/k/${ev.slug}/${token}`}
      maxGuestsLimit={MAX_GUESTS_LIMIT}
      packages={eventPackages()}
      pay={publicPayConfig(ev)}
      free={await freeDownloadState(ev)}
      initialOrder={order && /^[A-Z0-9-]{6,60}$/.test(order) ? order : null}
    />
  );
}
