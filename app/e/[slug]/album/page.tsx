import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEventBySlug, eventStats, guestShotCount, isOpen, isRevealed, listPhotos } from "@/lib/events";
import { currentGuest, isAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LangToggle, Logo } from "@/components/ui";
import AlbumView from "./AlbumView";
import { canDownload, publicPayConfig } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Album", robots: { index: false } };

export default async function AlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { slug } = await params;
  const { order } = await searchParams;
  const ev = await getEventBySlug(slug);
  if (!ev) redirect(`/e/${slug}`);
  const { t } = await getT();
  const [guest, admin, stats] = await Promise.all([currentGuest(ev), isAdmin(ev), eventStats(ev.id)]);
  const revealed = isRevealed(ev);
  const canSee = admin || (revealed && ev.visibility === "everyone");
  const photos = canSee ? await listPhotos(ev.id) : [];
  const mine = guest ? await guestShotCount(guest.id) : 0;
  const pay = publicPayConfig();
  const allowed = await canDownload(ev);

  return (
    <div className="album-page">
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="logo-link"><Logo /></Link>
          <nav>
            <LangToggle />
            {guest && isOpen(ev) && mine < ev.shotsPerGuest && (
              <Link className="btn btn-small btn-accent" href={`/e/${ev.slug}/kamera`}>📷 {t.guest.takePhotos}</Link>
            )}
          </nav>
        </div>
      </header>
      <div className="wrap">
        <div className="album-head">
          <Link href={`/e/${ev.slug}`} className="small muted" style={{ textDecoration: "none" }}>← {ev.name}</Link>
          <h1 style={{ fontSize: "clamp(30px,5vw,44px)", marginTop: 8 }}>{t.guest.toAlbum}</h1>
        </div>
        <AlbumView
          slug={ev.slug}
          eventName={ev.name}
          revealAt={ev.revealAt}
          revealed={revealed}
          hostOnly={ev.visibility === "host" && !admin}
          photos={photos}
          totalPhotos={stats.photos}
          mine={mine}
          isGuest={!!guest}
          pay={pay}
          canDownload={allowed}
          initialOrder={order && /^[A-Z0-9-]{6,60}$/.test(order) ? order : null}
        />
      </div>
    </div>
  );
}
