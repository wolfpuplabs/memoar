import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n-server";
import { HowItWorks, Faq } from "@/components/HowItWorks";

export const metadata: Metadata = { title: "How it works" };

export default async function HowPage() {
  const { t } = await getT();
  return (
    <>
      <HowItWorks t={t} headingLevel={1} />
      <Faq t={t} />
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-band">
            <h2>{t.home.ctaTitle}</h2>
            <p>{t.home.ctaLead}</p>
            <Link href="/buat" className="btn btn-accent">{t.home.ctaPrimary} →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
