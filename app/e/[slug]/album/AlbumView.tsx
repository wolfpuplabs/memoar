"use client";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18n";
import { Countdown, LocalTime } from "@/components/ui";
import { Gallery, type GPhoto } from "@/components/Gallery";
import { expiresAt } from "@/lib/retention";

export default function AlbumView({
  slug, eventName, revealAt, revealed, hostOnly, photos, totalPhotos, mine, isGuest,
}: {
  slug: string; eventName: string; revealAt: string; revealed: boolean; hostOnly: boolean;
  photos: GPhoto[]; totalPhotos: number; mine: number; isGuest: boolean;
}) {
  const { t } = useT();
  const router = useRouter();

  if (!revealed && !photos.length) {
    return (
      <div className="card developing">
        <div className="roll" aria-hidden="true" />
        <span className="eyebrow">{t.guest.developing}</span>
        <p className="muted" style={{ margin: 0 }}>{t.guest.developingLead}</p>
        <Countdown iso={revealAt} onDone={() => router.refresh()} />
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          📷 {totalPhotos} {t.common.photos}
          {isGuest && <> · {t.guest.yourRoll}: {mine} {t.guest.shotsTaken}</>}
        </p>
        <div className="undeveloped" aria-hidden="true">
          {Array.from({ length: Math.min(totalPhotos, 24) }).map((_, i) => <i key={i} />)}
        </div>
      </div>
    );
  }

  if (hostOnly) {
    return (
      <div className="card developing">
        <span className="eyebrow">{t.guest.toAlbum}</span>
        <p className="muted" style={{ margin: 0 }}>{t.guest.hostOnly}</p>
        {isGuest && <p className="small muted">{t.guest.yourRoll}: {mine} {t.guest.shotsTaken}</p>}
      </div>
    );
  }

  return (
    <>
      {revealed && (
        <p className="small muted" style={{ margin: "0 0 14px" }}>
          ⏳ {t.guest.expiresOn} <b><LocalTime iso={expiresAt({ revealAt })} mode="date" /></b>
        </p>
      )}
      <Gallery slug={slug} eventName={eventName} photos={photos} />
    </>
  );
}
