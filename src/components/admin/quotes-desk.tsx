"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatCents,
  quoteStatusLabel,
  type Lead,
  type Quote,
} from "@/lib/crm";
import { packages } from "@/lib/site";

export function QuotesDesk({
  initialQuotes,
  leads,
  prefillLead,
}: {
  initialQuotes: Quote[];
  leads: Lead[];
  prefillLead: Lead | null;
}) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: prefillLead?.name || "",
    clientEmail: prefillLead?.email || "",
    clientPhone: prefillLead?.phone || "",
    company: prefillLead?.company || "",
    venue: prefillLead?.venue || "",
    eventDate: prefillLead?.eventDate || "",
    leadId: prefillLead?.id || "",
  });

  async function createLaunchQuote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "stage-ready-launch",
          ...form,
          leadId: form.leadId || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      setQuotes((prev) => [body.quote, ...prev]);
      setMsg(`Quote ${body.quote.quoteNumber} created — Stage Ready $1,890 → $700.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => void createLaunchQuote(e)}
        className="ca-card ca-card-featured space-y-4 p-6"
      >
        <div>
          <p className="ca-eyebrow">Launch template</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-white">
            Stage Ready multi-cam — rack vs friend rate
          </h2>
          <p className="mt-2 text-sm text-ca-muted">
            Shows package at rack{" "}
            <strong className="text-white">
              {packages.find((p) => p.id === "stage-ready")
                ? `$${packages.find((p) => p.id === "stage-ready")!.priceFrom.toLocaleString()}`
                : "$1,890"}
            </strong>
            , then discounts to{" "}
            <strong className="text-ca-gold">$700</strong> as a birthday gift /
            launch favor (good rate in exchange for helping us get off the
            ground).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-zinc-500">
            Client name *
            <input
              className="ca-field mt-1 w-full"
              required
              value={form.clientName}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientName: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-zinc-500">
            Email *
            <input
              type="email"
              className="ca-field mt-1 w-full"
              required
              value={form.clientEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientEmail: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-zinc-500">
            Phone
            <input
              className="ca-field mt-1 w-full"
              value={form.clientPhone}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientPhone: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-zinc-500">
            Company / act
            <input
              className="ca-field mt-1 w-full"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-zinc-500">
            Venue
            <input
              className="ca-field mt-1 w-full"
              value={form.venue}
              onChange={(e) =>
                setForm((f) => ({ ...f, venue: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-zinc-500">
            Event date
            <input
              type="date"
              className="ca-field mt-1 w-full"
              value={form.eventDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, eventDate: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-zinc-500 sm:col-span-2">
            Attach to lead
            <select
              className="ca-field mt-1 w-full"
              value={form.leadId}
              onChange={(e) =>
                setForm((f) => ({ ...f, leadId: e.target.value }))
              }
            >
              <option value="">— none —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.email})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="ca-btn ca-btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create $700 multi-cam quote"}
          </button>
          {msg ? <span className="text-sm text-ca-muted">{msg}</span> : null}
        </div>
      </form>

      <div className="ca-card overflow-hidden">
        <div className="border-b border-white/5 px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-white">
            All quotes
          </h2>
        </div>
        {quotes.length === 0 ? (
          <p className="p-8 text-center text-sm text-ca-muted">
            No quotes yet — create the Stage Ready launch quote above.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {quotes.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/admin/quotes/${q.id}`}
                  className="flex flex-col gap-2 px-5 py-4 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {q.quoteNumber}{" "}
                      <span className="font-normal text-zinc-500">·</span>{" "}
                      {q.title}
                    </p>
                    <p className="mt-0.5 text-sm text-ca-muted">
                      {q.clientName} · {q.clientEmail}
                      {q.eventDate ? ` · ${q.eventDate}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="ca-pill">{quoteStatusLabel(q.status)}</span>
                    <span className="text-zinc-500 line-through">
                      {formatCents(q.rackSubtotalCents)}
                    </span>
                    <span className="font-display text-lg font-semibold text-ca-gold">
                      {formatCents(q.totalCents)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
