import type { Metadata } from "next";
import Link from "next/link";
import { getEventBySlug, eventStats, isOpen, isRevealed } from "@/lib/events";
import { currentGuest } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LangToggle, Logo } from "@/components/ui";
import Invite from "./Invite";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const ev = await getEventBySlug((await params).slug);
  return { title: ev?.name ?? "memoar", robots: { index: false } };
}

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

  const [guest, stats] = await Promise.all([currentGuest(ev), eventStats(ev.id)]);
  return (
    <div className="guest-page">
      <div className="gtop">
        <Link href="/" className="logo-link"><Logo light /></Link>
        <LangToggle dark />
      </div>
      <Invite
        ev={{
          slug: ev.slug,
          name: ev.name,
          kind: ev.kind,
          hostName: ev.hostName,
          message: ev.message,
          coverUrl: ev.coverUrl,
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          shotsPerGuest: ev.shotsPerGuest,
        }}
        photos={stats.photos}
        guests={stats.guests}
        full={stats.guests >= ev.maxGuests}
        open={isOpen(ev)}
        revealed={isRevealed(ev)}
        guestName={guest?.name ?? null}
      />
    </div>
  );
}
