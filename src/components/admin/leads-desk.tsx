"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  leadStatusLabel,
  type Lead,
} from "@/lib/crm";
import { packages } from "@/lib/site";

export function LeadsDesk({
  initialLeads,
  quoteCounts,
}: {
  initialLeads: Lead[];
  quoteCounts: Record<string, number>;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    packageId: "",
    notes: "",
    source: "manual",
  });

  const filtered = useMemo(() => {
    if (filter === "all") return leads;
    return leads.filter((l) => l.status === filter);
  }, [leads, filter]);

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          packageId: form.packageId || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      setLeads((prev) => [body.lead, ...prev]);
      setForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        packageId: "",
        notes: "",
        source: "manual",
      });
      setMsg("Lead added.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json();
    if (res.ok && body.lead) {
      setLeads((prev) => prev.map((l) => (l.id === id ? body.lead : l)));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ca-pill"
          data-active={filter === "all" || undefined}
          onClick={() => setFilter("all")}
        >
          All ({leads.length})
        </button>
        {LEAD_STATUSES.map((s) => {
          const n = leads.filter((l) => l.status === s).length;
          return (
            <button
              key={s}
              type="button"
              className="ca-pill"
              data-active={filter === s || undefined}
              onClick={() => setFilter(s)}
            >
              {leadStatusLabel(s)} ({n})
            </button>
          );
        })}
      </div>

      <form onSubmit={(e) => void addLead(e)} className="ca-card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Add lead
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-zinc-500">
            Name *
            <input
              className="ca-field mt-1 w-full"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="text-xs text-zinc-500">
            Email *
            <input
              type="email"
              className="ca-field mt-1 w-full"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="text-xs text-zinc-500">
            Phone
            <input
              className="ca-field mt-1 w-full"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="text-xs text-zinc-500">
            Company / artist
            <input
              className="ca-field mt-1 w-full"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-zinc-500">
            Package interest
            <select
              className="ca-field mt-1 w-full"
              value={form.packageId}
              onChange={(e) =>
                setForm((f) => ({ ...f, packageId: e.target.value }))
              }
            >
              <option value="">—</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-500">
            Source
            <select
              className="ca-field mt-1 w-full"
              value={form.source}
              onChange={(e) =>
                setForm((f) => ({ ...f, source: e.target.value }))
              }
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs text-zinc-500">
          Notes
          <textarea
            className="ca-field mt-1 w-full min-h-[72px]"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="ca-btn ca-btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Add lead"}
          </button>
          {msg ? <span className="text-sm text-ca-muted">{msg}</span> : null}
        </div>
      </form>

      <div className="ca-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-ca-muted">
            No leads yet — add one above or wait for a booking request.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((lead) => {
              const pkg = packages.find((p) => p.id === lead.packageId);
              const qn = quoteCounts[lead.id] || 0;
              return (
                <li key={lead.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{lead.name}</p>
                      <p className="mt-0.5 text-sm text-ca-muted">
                        <a
                          href={`mailto:${lead.email}`}
                          className="hover:text-ca-gold"
                        >
                          {lead.email}
                        </a>
                        {lead.phone ? ` · ${lead.phone}` : ""}
                        {lead.company ? ` · ${lead.company}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {lead.source}
                        {pkg ? ` · ${pkg.name}` : ""}
                        {lead.eventDate ? ` · event ${lead.eventDate}` : ""}
                        {lead.venue ? ` · ${lead.venue}` : ""}
                        {qn > 0 ? ` · ${qn} quote${qn === 1 ? "" : "s"}` : ""}
                      </p>
                      {lead.notes ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
                          {lead.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <select
                        className="ca-field text-xs"
                        value={lead.status}
                        onChange={(e) => void setStatus(lead.id, e.target.value)}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {leadStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                      <Link
                        href={`/admin/quotes?leadId=${lead.id}`}
                        className="ca-btn ca-btn-secondary ca-btn-sm"
                      >
                        Quote
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
