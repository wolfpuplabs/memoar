import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18n";
import { getLang } from "@/lib/i18n-server";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description =
  "Turn your guests' phones into pocket film cameras. One QR code, no app, limited shots, and every photo develops at the same time.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "memoar by wolfpuplabs", template: "%s · memoar by wolfpuplabs" },
  description,
  applicationName: "memoar by wolfpuplabs",
  // Plain root paths (no query strings) so every browser's "Add to Home Screen" finds them.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "memoar", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "memoar by wolfpuplabs",
    locale: "en_US",
    alternateLocale: ["id_ID"],
    title: "memoar by wolfpuplabs",
    description,
  },
  twitter: { card: "summary_large_image", title: "memoar by wolfpuplabs", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0911",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
