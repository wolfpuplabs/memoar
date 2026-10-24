import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEventBySlug, guestShotCount, isOpen } from "@/lib/events";
import { currentGuest } from "@/lib/auth";
import Camera from "./Camera";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Camera", robots: { index: false } };

export default async function CameraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) redirect(`/e/${slug}`);
  const guest = await currentGuest(ev);
  if (!guest || !isOpen(ev)) redirect(`/e/${ev.slug}`);
  const used = await guestShotCount(guest.id);
  return (
    <Camera
      slug={ev.slug}
      eventName={ev.name}
      endsAt={ev.endsAt}
      guestName={guest.name}
      look={ev.filter}
      stamp={ev.dateStamp}
      total={ev.shotsPerGuest}
      used={used}
      allowUploads={ev.allowUploads}
      guestLooks={ev.guestLooks}
    />
  );
}
