"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Paywall, { LockIcon, rupiah, type PayCfg } from "@/components/Paywall";
import { useT } from "@/components/I18n";
import { Countdown, LocalTime } from "@/components/ui";
import { Gallery, type GPhoto } from "@/components/Gallery";
import { expiresAt } from "@/lib/retention";

export default function AlbumView({
  slug, eventName, revealAt, revealed, hostOnly, photos, totalPhotos, mine, isGuest,
  pay, canDownload, initialOrder, freeLeft, freeIds,
}: {
  slug: string; eventName: string; revealAt: string; revealed: boolean; hostOnly: boolean;
  photos: GPhoto[]; totalPhotos: number; mine: number; isGuest: boolean;
  pay: PayCfg; canDownload: boolean; initialOrder: string | null;
  freeLeft: number; freeIds: string[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(canDownload);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const openSheet = (left?: number) => {
    const n = String(pay.freeDownloads);
    setNote(left === undefined ? null : left > 0 ? t.pay.freeTooMany.replaceAll("{n}", String(left)) : pay.freeDownloads > 0 ? t.pay.freeUsedUp.replace("{n}", n) : null);
    setSheet(true);
  };
  const locked = pay.enabled && !unlocked;

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
      {locked && photos.length > 0 && (
        <button type="button" className="unlock-strip" onClick={() => openSheet()}>
          <span className="pw-lock"><LockIcon size={16} /></span>
          <span className="us-text"><b>{t.pay.personTitle}</b><small>{pay.freeDownloads > 0 ? t.pay.freeHint.replace("{n}", String(pay.freeDownloads)) + " · " + t.pay.methods : t.pay.methods}</small></span>
          <span className="us-price">{rupiah(pay.pricePerson)}</span>
        </button>
      )}
      <Gallery slug={slug} eventName={eventName} photos={photos} locked={locked} onLocked={openSheet} freeLeft={freeLeft} freeIds={freeIds} />
      {pay.enabled && (
        <Paywall
          slug={slug}
          admin={false}
          cfg={pay}
          open={sheet}
          note={note}
          initialOrder={initialOrder}
          onClose={() => setSheet(false)}
          onUnlocked={() => { setUnlocked(true); setSheet(false); router.replace(`/e/${slug}/album`); }}
        />
      )}
    </>
  );
}
