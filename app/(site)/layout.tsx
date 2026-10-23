import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { LangToggle, Logo } from "@/components/ui";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="logo-link" aria-label="memoar">
            <Logo />
          </Link>
          <nav>
            <Link className="link" href="/cara-kerja">{t.nav.how}</Link>
            <LangToggle />
            <Link className="btn btn-small" href="/buat">{t.nav.start}</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <div>
            <Logo />
            <p style={{ margin: "8px 0 0" }}>{t.footer.made}</p>
          </div>
          <nav>
            <Link href="/cara-kerja">{t.footer.how}</Link>
            <Link href="/buat">{t.footer.create}</Link>
          </nav>
          <span className="small">© {new Date().getFullYear()} memoar</span>
        </div>
      </footer>
    </>
  );
}
