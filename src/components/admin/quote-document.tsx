"use client";

import { useState } from "react";
import {
  formatCents,
  QUOTE_STATUSES,
  quoteStatusLabel,
  type Quote,
} from "@/lib/crm";
import { packages, site } from "@/lib/site";

export function QuoteDocument({ initialQuote }: { initialQuote: Quote }) {
  const [quote, setQuote] = useState(initialQuote);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pkg = packages.find((p) => p.id === quote.packageId);

  async function setStatus(status: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Update failed");
      setQuote(body.quote);
      setMsg(`Marked ${quoteStatusLabel(status)}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ca-field text-sm"
            value={quote.status}
            disabled={busy}
            onChange={(e) => void setStatus(e.target.value)}
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {quoteStatusLabel(s)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ca-btn ca-btn-primary ca-btn-sm"
            onClick={() => window.print()}
          >
            Print / save PDF
          </button>
        </div>
        {msg ? <span className="text-sm text-ca-muted">{msg}</span> : null}
      </div>

      <article className="ca-card mx-auto max-w-3xl p-6 sm:p-10 print:border print:border-zinc-300 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-white/10 pb-6 print:border-zinc-200">
          <div>
            <p className="ca-eyebrow">{site.name}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-white print:text-black">
              {quote.status === "invoiced" ? "Invoice" : "Quote"}
            </h1>
            <p className="mt-2 text-sm text-ca-muted print:text-zinc-600">
              {quote.quoteNumber}
              {quote.validUntil ? ` · Valid through ${quote.validUntil}` : ""}
            </p>
          </div>
          <div className="text-right text-sm text-ca-muted print:text-zinc-600">
            <p className="font-medium text-white print:text-black">{site.name}</p>
            <p>{site.email}</p>
            <p>{site.phone}</p>
            <p className="mt-1 max-w-[14rem] text-xs">{site.location}</p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Bill to
            </p>
            <p className="mt-1 font-semibold text-white print:text-black">
              {quote.clientName}
            </p>
            {quote.company ? (
              <p className="text-sm text-ca-muted print:text-zinc-600">
                {quote.company}
              </p>
            ) : null}
            <p className="text-sm text-ca-muted print:text-zinc-600">
              {quote.clientEmail}
            </p>
            {quote.clientPhone ? (
              <p className="text-sm text-ca-muted print:text-zinc-600">
                {quote.clientPhone}
              </p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Project
            </p>
            <p className="mt-1 font-semibold text-white print:text-black">
              {quote.title}
            </p>
            {pkg ? (
              <p className="text-sm text-ca-muted print:text-zinc-600">
                Package: {pkg.name}
              </p>
            ) : null}
            {quote.eventDate ? (
              <p className="text-sm text-ca-muted print:text-zinc-600">
                Event: {quote.eventDate}
              </p>
            ) : null}
            {quote.venue ? (
              <p className="text-sm text-ca-muted print:text-zinc-600">
                Venue: {quote.venue}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-zinc-500">
              Status: {quoteStatusLabel(quote.status)}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 print:border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-zinc-500 print:bg-zinc-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Qty</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-zinc-200">
              {quote.lineItems.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-zinc-200 print:text-zinc-800">
                    {line.description}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {line.qty}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {formatCents(line.unitPriceCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white print:text-black">
                    {formatCents(line.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-full max-w-xs justify-between gap-6 text-ca-muted print:text-zinc-600">
            <span>Rack subtotal</span>
            <span className="font-medium text-white print:text-black">
              {formatCents(quote.rackSubtotalCents)}
            </span>
          </div>
          {quote.discountCents > 0 ? (
            <div className="flex w-full max-w-xs flex-col items-end gap-0.5">
              <div className="flex w-full justify-between gap-6 text-ca-muted print:text-zinc-600">
                <span>Discount</span>
                <span className="font-medium text-emerald-400 print:text-emerald-700">
                  −{formatCents(quote.discountCents)}
                </span>
              </div>
              {quote.discountLabel ? (
                <p className="max-w-xs text-right text-xs leading-snug text-zinc-500">
                  {quote.discountLabel}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-2 flex w-full max-w-xs justify-between gap-6 border-t border-white/10 pt-3 print:border-zinc-200">
            <span className="font-semibold text-white print:text-black">
              Total due
            </span>
            <span className="font-display text-2xl font-semibold text-ca-gold print:text-black">
              {formatCents(quote.totalCents)}
            </span>
          </div>
        </div>

        {quote.notes ? (
          <div className="mt-8 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 print:bg-zinc-50 print:text-zinc-700">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        ) : null}

        {quote.terms ? (
          <div className="mt-6 text-xs leading-relaxed text-zinc-500 print:text-zinc-600">
            <p className="font-semibold uppercase tracking-wider">Terms</p>
            <p className="mt-1 whitespace-pre-wrap">{quote.terms}</p>
          </div>
        ) : null}

        <p className="mt-10 text-center text-[11px] text-zinc-600 print:text-zinc-500">
          Thank you for working with {site.name}. Questions? {site.email} ·{" "}
          {site.phone}
        </p>
      </article>
    </div>
  );
}
