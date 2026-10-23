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
  "Ubah ponsel tamu menjadi kamera film saku. Satu kode QR, tanpa aplikasi, jepretan terbatas, dan semua foto dicuci bersamaan.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "memoar — kamera sekali pakai untuk acaramu", template: "%s · memoar" },
  description,
  applicationName: "memoar",
  appleWebApp: { capable: true, title: "memoar", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "memoar",
    locale: "id_ID",
    title: "memoar — kamera sekali pakai untuk acaramu",
    description,
  },
  twitter: { card: "summary_large_image", title: "memoar — kamera sekali pakai untuk acaramu", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5efe4",
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
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&display=swap"
        />
      </head>
      <body>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
