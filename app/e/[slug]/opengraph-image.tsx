import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getEventBySlug } from "@/lib/events";
import { getDict } from "@/lib/i18n";

export const runtime = "nodejs";
export const alt = "Undangan memoar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="27" width="80" height="56" rx="14" fill="#f5efe4"/><rect x="20" y="18" width="22" height="13" rx="4" fill="#f5efe4"/><circle cx="54" cy="55" r="19" fill="#1e1a15"/><circle cx="54" cy="55" r="12.5" fill="#f5efe4"/><circle cx="54" cy="55" r="6" fill="#1e1a15"/><circle cx="78" cy="38" r="4.2" fill="#e0562a"/></svg>`;
const markSrc = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

/** Share preview for a guest invite link: shows the event name, host and cover. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug).catch(() => null);
  const t = getDict("id");
  const [fraunces, dm500, dm700] = await Promise.all([
    font("Fraunces-600.woff"),
    font("DMSans-500.woff"),
    font("DMSans-700.woff"),
  ]);

  const name = ev?.name ?? "memoar";
  const nameSize = name.length > 34 ? 56 : name.length > 20 ? 68 : 80;
  const cover = ev?.coverUrl?.startsWith("http") ? ev.coverUrl : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f5efe4", fontFamily: "DM" }}>
        <div
          style={{
            width: 470,
            height: "100%",
            display: "flex",
            position: "relative",
            background: "linear-gradient(160deg, #f8b26a 0%, #d0603d 48%, #4d2638 100%)",
          }}
        >
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} width={470} height={630} style={{ width: 470, height: 630, objectFit: "cover" }} alt="" />
          )}
          {!cover && (
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={markSrc} width={220} height={220} alt="" style={{ opacity: 0.95 }} />
            </div>
          )}
          <div
            style={{
              position: "absolute",
              right: 24,
              bottom: 22,
              fontFamily: "monospace",
              fontSize: 26,
              fontWeight: 700,
              color: "#ffb15c",
              letterSpacing: 2,
            }}
          >
            {(() => {
              // Rendered on the server, so use Indonesian (WIB) time for the stamp.
              const p = Object.fromEntries(
                new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "2-digit", month: "2-digit", day: "2-digit" })
                  .formatToParts(ev ? new Date(ev.startsAt) : new Date())
                  .map((x) => [x.type, x.value])
              );
              return `'${p.year}  ${p.month}  ${p.day}`;
            })()}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "64px 64px 56px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "#5d5348" }}>
            <div style={{ width: 12, height: 12, borderRadius: 12, background: "#e0562a", marginRight: 12 }} />
            {`UNDANGAN · ${(ev ? t.kinds[ev.kind] : "memoar").toUpperCase()}`}
          </div>
          <div
            style={{
              fontFamily: "Fraunces",
              fontSize: nameSize,
              lineHeight: 1.04,
              letterSpacing: -2,
              color: "#1e1a15",
              marginTop: 28,
              display: "flex",
            }}
          >
            {name}
          </div>
          {ev?.hostName && (
            <div style={{ fontSize: 28, color: "#5d5348", marginTop: 18, display: "flex" }}>
              {`${t.guest.invitedBy} ${ev.hostName}`}
            </div>
          )}
          <div style={{ flex: 1, display: "flex" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                background: "#e0562a",
                color: "#fff",
                fontSize: 26,
                fontWeight: 700,
                padding: "16px 28px",
                borderRadius: 999,
              }}
            >
              {t.guest.join}
            </div>
            <div style={{ display: "flex", alignItems: "center", fontFamily: "Fraunces", fontSize: 34, color: "#1e1a15" }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: "#1e1a15", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={markSrc} width={38} height={38} alt="" />
              </div>
              memoar
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "DM", data: dm500, weight: 500, style: "normal" },
        { name: "DM", data: dm700, weight: 700, style: "normal" },
      ],
    }
  );
}
