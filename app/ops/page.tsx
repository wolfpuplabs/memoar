import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { hashToken, safeEqualHex } from "@/lib/ids";
import { assumptions, windowStats } from "@/lib/ops";
import { decideManual, listPendingManual, manualConfig } from "@/lib/manual-qris";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "ops" }, robots: { index: false, follow: false } };

const idr = (n: number) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
const pct = (n: number) => (n * 100).toFixed(1) + "%";
const keyOk = (key: string | undefined) => {
  const secret = process.env.OPS_KEY;
  return !!secret && !!key && safeEqualHex(hashToken(key), hashToken(secret));
};

/** Confirms or rejects a manual QRIS order after checking the bank mutation. */
async function decide(form: FormData) {
  "use server";
  const key = String(form.get("key") || "");
  if (!keyOk(key)) notFound();
  await decideManual(String(form.get("order") || ""), form.get("do") === "ok");
  redirect(`/ops?key=${encodeURIComponent(key)}&done=${encodeURIComponent(String(form.get("order") || ""))}`);
}

const COLOR = { GO: "#1f8a4c", HOLD: "#b7791f", "NO-GO": "#c53030" } as const;

/**
 * Private KPI + ROI page for the go / no-go decision. Open with
 * /ops?key=OPS_KEY. Without OPS_KEY set in the environment the page does not exist.
 */
export default async function Ops({ searchParams }: { searchParams: Promise<{ key?: string; done?: string }> }) {
  const { key, done } = await searchParams;
  if (!keyOk(key)) notFound();

  const [w7, w30, w90, manual] = await Promise.all([windowStats(7), windowStats(30), windowStats(90), listPendingManual()]);
  const mq = manualConfig();
  const a = assumptions();
  const rows: [string, (s: typeof w30) => string][] = [
    ["Created", (s) => String(s.created)],
    ["Joined (guests)", (s) => String(s.joined)],
    ["Photos uploaded", (s) => `${s.photos} · ${s.gb.toFixed(2)} GB`],
    ["Paywall hits", (s) => String(s.paywall)],
    ["Payments (refunds)", (s) => `${s.paid} (${s.refunded})`],
    ["Downloads", (s) => String(s.downloads)],
    ["Conversion paid ÷ created", (s) => pct(s.conversion)],
    ["Gross revenue", (s) => idr(s.gross)],
    ["Payment fees (est.)", (s) => idr(s.fees)],
    ["Storage + transfer (est.)", (s) => idr(s.infra)],
    ["Fixed costs (pro-rata)", (s) => idr(s.fixed)],
    ["Net", (s) => idr(s.net)],
    ["ROI net ÷ cost", (s) => pct(s.roi)],
  ];

  return (
    <main className="wrap" style={{ padding: "32px 16px 64px", maxWidth: 880 }}>
      <h1 style={{ fontSize: 32, margin: "0 0 4px" }}>ops · go / no-go</h1>
      <p className="muted small" style={{ margin: "0 0 24px" }}>
        Decision uses the 30-day window. Estimates use the assumptions listed below; change them with OPS_* env vars.
      </p>
      {mq.enabled && (
        <section className="card pad" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Manual QRIS waiting · {manual.length}</h2>
          <p className="muted small" style={{ margin: "0 0 12px" }}>
            Check the mutation in {mq.options.map((o) => `${o.merchant}${o.issuer ? ` (${o.issuer})` : ""}`).join(" and ")}. Confirm only when the
            amount matches to the last 3 digits. Orders expire after 3 days.
          </p>
          {done && <p className="small" style={{ margin: "0 0 12px" }}>✓ {done} updated</p>}
          {manual.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>Nothing waiting.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {manual.map((m) => (
                <div key={m.orderId} style={{ borderTop: "1px solid rgba(127,127,127,.25)", paddingTop: 12, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                    <b style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{idr(m.amount)}</b>
                    <a href={`/e/${m.slug}`}>{m.eventName}</a>
                  </div>
                  <div className="muted small">
                    {m.orderId} · {new Date(m.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                  </div>
                  <form action={decide} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="order" value={m.orderId} />
                    <button className="btn btn-small btn-accent" name="do" value="ok">Confirm paid</button>
                    <button className="btn btn-small btn-ghost" name="do" value="no">Reject</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="card pad" style={{ borderLeft: `6px solid ${COLOR[w30.decision]}`, marginBottom: 24 }}>
        <b style={{ fontSize: 24, color: COLOR[w30.decision] }}>{w30.decision}</b>
        <p style={{ margin: "6px 0 0" }}>{w30.why}</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Metric</th>
              <th style={{ textAlign: "right", padding: 8 }}>7 days</th>
              <th style={{ textAlign: "right", padding: 8 }}>30 days</th>
              <th style={{ textAlign: "right", padding: 8 }}>90 days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, f]) => (
              <tr key={label} style={{ borderTop: "1px solid rgba(127,127,127,.25)" }}>
                <td style={{ padding: 8 }}>{label}</td>
                <td style={{ padding: 8, textAlign: "right" }}>{f(w7)}</td>
                <td style={{ padding: 8, textAlign: "right" }}>{f(w30)}</td>
                <td style={{ padding: 8, textAlign: "right" }}>{f(w90)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 style={{ fontSize: 18, marginTop: 32 }}>Assumptions</h2>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{JSON.stringify(a, null, 2)}</pre>
    </main>
  );
}
