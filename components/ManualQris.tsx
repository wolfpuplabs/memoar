"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./I18n";
import { QRImage } from "./QR";
import { rupiah } from "./Paywall";

type Option = { payload: string; merchant: string; issuer: string };
type Order = { orderId: string; amount: number; options: Option[] };

/**
 * Host-only sheet for paying a large package through the merchant's static
 * QRIS. Shows the unique amount, then waits for the operator to confirm the
 * transfer on /ops (polls the normal payment status endpoint).
 */
export default function ManualQris({ slug, open, onClose, onUnlocked }: {
  slug: string; open: boolean; onClose: () => void; onUnlocked: () => void;
}) {
  const { t } = useT();
  const p = t.pay;
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pick, setPick] = useState(0);
  const done = useRef(onUnlocked);
  done.current = onUnlocked;
  const busy = useRef(false);

  // one request per opening; a failed one can be retried by closing and reopening
  useEffect(() => {
    if (!open || order || busy.current) return;
    busy.current = true;
    setErr(null);
    fetch(`/api/e/${slug}/pay/manual`, { method: "POST" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (j.unlocked) return done.current();
        if (!r.ok || !j.orderId) throw new Error(j.error || "manual");
        setOrder(j as Order);
      })
      .catch(() => setErr(t.pay.manualBusy))
      .finally(() => { busy.current = false; });
  }, [open, order, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = useCallback(async () => {
    if (!order) return;
    const r = await fetch(`/api/e/${slug}/pay?order=${encodeURIComponent(order.orderId)}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (j.eventUnlocked) done.current();
  }, [order, slug]);

  useEffect(() => {
    if (!open || !order) return;
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [open, order, check]);

  const copy = async () => {
    if (!order) return;
    try { await navigator.clipboard.writeText(String(order.amount)); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!open) return null;
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="mq-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet mq">
        <div className="sheet-grip" />
        <h3 id="mq-title" style={{ margin: 0 }}>{p.manualTitle}</h3>
        <p className="muted small" style={{ margin: 0 }}>{p.manualD}</p>
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        {order ? (
          <>
            {order.options.length > 1 && (
              <div className="mq-pick" role="tablist" aria-label={p.manualPickQr}>
                {order.options.map((o, i) => (
                  <button key={o.payload} type="button" role="tab" aria-selected={pick === i} className={pick === i ? "on" : ""} onClick={() => setPick(i)}>
                    QRIS {o.issuer || i + 1}
                  </button>
                ))}
              </div>
            )}
            {(() => {
              const o = order.options[Math.min(pick, order.options.length - 1)];
              return (
                <div className="mq-qr">
                  <QRImage value={o.payload} alt={`QRIS ${o.merchant}`} />
                  <span>{p.manualMerchant}: <b>{o.merchant}</b>{o.issuer ? ` · ${o.issuer}` : ""}</span>
                </div>
              );
            })()}
            <div className="mq-amount">
              <span className="label">{p.manualAmount}</span>
              <div className="copyrow">
                <b>{rupiah(order.amount)}</b>
                <button type="button" className="btn btn-small" onClick={copy}>{copied ? t.common.copied : t.common.copy}</button>
              </div>
              <span className="hint">{p.manualExact}</span>
            </div>
            <div className="mq-status">
              <div className="pw-spinner" />
              <div>
                <b>{p.manualPending}</b>
                <p className="muted small" style={{ margin: "4px 0 0" }}>{p.manualPendingD}</p>
                <p className="muted small" style={{ margin: "6px 0 0" }}>{p.manualOrder}: <code>{order.orderId}</code></p>
              </div>
            </div>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn btn-ghost btn-small" onClick={check}>{p.check}</button>
              <button className="btn btn-ghost btn-small" onClick={onClose}>{t.common.close}</button>
            </div>
          </>
        ) : !err ? (
          <div className="pw-state"><div className="pw-spinner" /></div>
        ) : null}
      </div>
    </div>
  );
}
