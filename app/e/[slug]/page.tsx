import type { Metadata } from "next";
import Link from "next/link";
import { getEventBySlug, eventStats, guestShotCount, isOpen, isRevealed, listPhotos } from "@/lib/events";
import { currentGuest, isAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LangToggle, Logo } from "@/components/ui";
import Invite from "./Invite";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const ev = await getEventBySlug((await params).slug);
  if (!ev) return { title: "memoar by wolfpuplabs", robots: { index: false } };
  const description = `${ev.hostName ? `Invited by ${ev.hostName}. ` : ""}Grab the camera and capture this event from your point of view — no app needed.`;
  return {
    title: ev.name,
    description,
    robots: { index: false },
    openGraph: { title: ev.name, description, type: "website", siteName: "memoar by wolfpuplabs" },
    twitter: { card: "summary_large_image", title: ev.name, description },
  };
}

const FALLBACK_COVER: Record<string, string> = {
  pernikahan: "cake",
  lamaran: "sunset",
  ulangtahun: "birthday",
  pesta: "hands-up",
  wisuda: "confetti",
  kantor: "glasses",
  lainnya: "confetti",
};

export default async function GuestEntry({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();
  const ev = await getEventBySlug(slug);

  if (!ev) {
    return (
      <div className="guest-page">
        <div className="gtop"><Link href="/" className="logo-link"><Logo light /></Link><LangToggle dark /></div>
        <div className="center-page">
          <div>
            <h1>{t.guest.notFound}</h1>
            <p style={{ opacity: 0.7 }}>{t.guest.notFoundLead}</p>
          </div>
        </div>
      </div>
    );
  }

  const [guest, admin, stats] = await Promise.all([currentGuest(ev), isAdmin(ev), eventStats(ev.id)]);
  const revealed = isRevealed(ev);
  const canSee = admin || (revealed && ev.visibility === "everyone");
  const photos = canSee ? (await listPhotos(ev.id)).slice(-12).reverse() : [];
  const used = guest ? await guestShotCount(guest.id) : 0;

  return (
    <Invite
      ev={{
        slug: ev.slug,
        name: ev.name,
        hostName: ev.hostName,
        message: ev.message,
        coverUrl: ev.coverUrl ?? `/photos/${FALLBACK_COVER[ev.kind] ?? "confetti"}.jpg`,
        endsAt: ev.endsAt,
        revealAt: ev.revealAt,
        shotsPerGuest: ev.shotsPerGuest,
      }}
      photoCount={stats.photos}
      guests={stats.guests}
      full={stats.guests >= ev.maxGuests}
      open={isOpen(ev)}
      revealed={revealed}
      canSee={canSee}
      hostOnly={ev.visibility === "host" && !admin}
      preview={photos.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl, guestName: p.guestName }))}
      guestName={guest?.name ?? null}
      shotsLeft={Math.max(0, ev.shotsPerGuest - used)}
    />
  );
}
