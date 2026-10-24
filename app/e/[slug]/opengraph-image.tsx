import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getEventBySlug } from "@/lib/events";
import { getDict } from "@/lib/i18n";

export const runtime = "nodejs";
export const alt = "memoar invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="27" width="80" height="56" rx="14" fill="#f5f5f7"/><rect x="20" y="18" width="22" height="13" rx="4" fill="#f5f5f7"/><circle cx="54" cy="55" r="19" fill="#0b0b0d"/><circle cx="54" cy="55" r="12.5" fill="#f5f5f7"/><circle cx="54" cy="55" r="6" fill="#0b0b0d"/><circle cx="78" cy="38" r="4.2" fill="#0b0b0d"/></svg>`;
const markSrc = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

/** Share preview for a guest invite link: shows the event name, host and cover. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug).catch(() => null);
  const t = getDict("en");
  const [sans500, sans600, serif] = await Promise.all([
    font("PlusJakartaSans-500.woff"),
    font("PlusJakartaSans-600.woff"),
    font("InstrumentSerif-Italic.woff"),
  ]);

  const name = ev?.name ?? "memoar";
  const nameSize = name.length > 34 ? 54 : name.length > 20 ? 66 : 78;
  const cover = ev?.coverUrl?.startsWith("http") ? ev.coverUrl : null;

  // Rendered on the server, so use Indonesian (WIB) time for the stamp.
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "2-digit", month: "2-digit", day: "2-digit" })
      .formatToParts(ev ? new Date(ev.startsAt) : new Date())
      .map((x) => [x.type, x.value])
  );
  const stamp = `'${p.year}  ${p.month}  ${p.day}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#08080a",
          backgroundImage:
            "radial-gradient(520px 420px at 92% 0%, rgba(255,255,255,0.14), transparent 70%), radial-gradient(480px 420px at 60% 110%, rgba(255,255,255,0.08), transparent 70%)",
          fontFamily: "PJS",
          color: "#f5f5f7",
          padding: 24,
        }}
      >
        {/* cover / photo frame */}
        <div
          style={{
            width: 440,
            height: "100%",
            display: "flex",
            position: "relative",
            borderRadius: 30,
            overflow: "hidden",
            background: "linear-gradient(165deg, #e4e4e8 0%, #a2a2aa 40%, #4a4a52 75%, #151518 100%)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} width={440} height={582} style={{ width: 440, height: 582, objectFit: "cover", filter: "grayscale(1)" }} alt="" />
          ) : (
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(10,10,12,0.55)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={markSrc} width={150} height={150} alt="" />
              </div>
            </div>
          )}
          <div
            style={{
              position: "absolute",
              right: 22,
              bottom: 20,
              fontFamily: "monospace",
              fontSize: 24,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: 2,
              textShadow: "0 0 10px rgba(255,255,255,0.6)",
            }}
          >
            {stamp}
          </div>
        </div>

        {/* text */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 40px 32px 56px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              fontSize: 17,
              letterSpacing: 3,
              color: "rgba(245,245,247,0.75)",
              padding: "9px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 8, background: "#fff", marginRight: 10 }} />
            {`INVITATION · ${(ev ? t.kinds[ev.kind] : "memoar").toUpperCase()}`}
          </div>
          <div
            style={{
              fontFamily: "PJS",
              fontWeight: 600,
              fontSize: nameSize,
              lineHeight: 1.03,
              letterSpacing: -2.5,
              marginTop: 30,
              display: "flex",
            }}
          >
            {name}
          </div>
          {ev?.hostName && (
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 18, fontSize: 28, color: "rgba(245,245,247,0.7)" }}>
              <span style={{ fontFamily: "IS", fontStyle: "italic", fontSize: 34, color: "#fff", marginRight: 10 }}>from</span>
              {ev.hostName}
            </div>
          )}
          <div style={{ flex: 1, display: "flex" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                background: "#f5f5f7",
                color: "#0a0a0c",
                fontSize: 25,
                fontWeight: 600,
                padding: "16px 28px",
                borderRadius: 999,
              }}
            >
              {t.guest.join}
            </div>
            <div style={{ display: "flex", alignItems: "center", fontSize: 32, fontWeight: 600, letterSpacing: -1.2 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: "#1a1a1e",
                  border: "1px solid rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={markSrc} width={36} height={36} alt="" />
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
        { name: "PJS", data: sans500, weight: 500, style: "normal" },
        { name: "PJS", data: sans600, weight: 600, style: "normal" },
        { name: "IS", data: serif, weight: 400, style: "italic" },
      ],
    }
  );
}
