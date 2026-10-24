"use client";
import type { EventPackage } from "@/lib/packages";
import { useT } from "./I18n";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/** Event package cards: guest limit + host unlock price. */
export default function PackagePicker({ packages, value, onChange }: { packages: EventPackage[]; value: string; onChange: (id: string) => void }) {
  const { t, lang } = useT();
  return (
    <div className="pkg-grid" role="radiogroup" aria-label={t.create.package}>
      {packages.map((p) => (
        <button key={p.id} type="button" role="radio" aria-checked={value === p.id} className={`pkg ${value === p.id ? "on" : ""}`} onClick={() => onChange(p.id)}>
          <span className="pkg-name">{p.name[lang]}</span>
          <span className="pkg-guests">{t.create.upToGuests.replace("{n}", String(p.guests))}</span>
          <b className="pkg-price">{p.price === 0 ? t.create.freeLabel : rupiah(p.price)}</b>
          <span className="pkg-note">{p.note[lang]}</span>
        </button>
      ))}
    </div>
  );
}
