"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconArrow, IconCheck } from "@/components/icons";
import { ModeBadge } from "@/components/ui/mode-badge";
import { BOOKINGS_STORAGE_KEY } from "@/lib/portal";
import { formatMoney, packages, type PackageId, site } from "@/lib/site";

type Form = {
  packageId: PackageId | "";
  eventDate: string;
  venue: string;
  city: string;
  setLength: string;
  artistOrEvent: string;
  notes: string;
  name: string;
  email: string;
  phone: string;
  company: string;
};

const initial: Form = {
  packageId: "",
  eventDate: "",
  venue: "",
  city: "",
  setLength: "",
  artistOrEvent: "",
  notes: "",
  name: "",
  email: "",
  phone: "",
  company: "",
};

const steps = ["Package", "Event", "Contact", "Review"] as const;

export function BookingForm({ defaultPackage }: { defaultPackage?: string }) {
  const pre =
    packages.find((p) => p.id === defaultPackage)?.id ??
    ("" as Form["packageId"]);
  const [step, setStep] = useState(pre ? 1 : 0);
  const [form, setForm] = useState<Form>({ ...initial, packageId: pre || "" });
  const [errors, setErrors] = useState<string[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);

  const selected = useMemo(
    () => packages.find((p) => p.id === form.packageId),
    [form.packageId],
  );

  function validate() {
    const e: string[] = [];
    if (step === 0 && !form.packageId) e.push("Choose a package.");
    if (step === 1) {
      if (!form.eventDate) e.push("Event date is required.");
      if (!form.venue.trim()) e.push("Venue is required.");
      if (!form.artistOrEvent.trim()) e.push("Artist or event name is required.");
    }
    if (step === 2) {
      if (!form.name.trim()) e.push("Your name is required.");
      if (!form.email.includes("@")) e.push("Valid email is required.");
      if (!form.phone.trim()) e.push("Phone is required.");
    }
    setErrors(e);
    return e.length === 0;
  }

  function next() {
    if (!validate()) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function submit() {
    if (!validate()) return;
    const id = `CA-${Date.now().toString().slice(-6)}`;
    try {
      const prev = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY) || "[]");
      prev.unshift({
        id,
        createdAt: new Date().toISOString(),
        status: "pending-review",
        ...form,
        packageName: selected?.name,
        priceFrom: selected?.priceFrom,
        mode: selected?.mode,
      });
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(prev));
    } catch {
      /* demo */
    }
    setOrderId(id);
  }

  if (orderId) {
    return (
      <div className="ca-card ca-card-featured p-8 text-center sm:p-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ca-gold/15 text-ca-gold ring-1 ring-ca-gold/30">
          <IconCheck className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">
          Request received
        </h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ca-muted">
          Order{" "}
          <span className="font-mono text-ca-gold">{orderId}</span> is in our
          queue. We&apos;ll confirm crew and ShareGrid kit within one business
          day.
        </p>
        {selected && (
          <p className="mt-4 text-sm text-zinc-400">
            {selected.name} · from {formatMoney(selected.priceFrom)} ·{" "}
            {form.eventDate || "date TBD"}
          </p>
        )}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/portal/bookings" className="ca-btn ca-btn-primary">
            Open client portal
          </Link>
          <Link href="/" className="ca-btn ca-btn-secondary">
            Back to home
          </Link>
          <a
            href={`mailto:${site.email}?subject=Booking%20${orderId}`}
            className="ca-btn ca-btn-secondary"
          >
            Email us
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="ca-card p-5 sm:p-8">
      <ol className="flex flex-wrap gap-2 sm:gap-3">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < step
                  ? "bg-ca-gold text-ca-ink"
                  : i === step
                    ? "bg-white text-ca-ink ring-2 ring-white/20"
                    : "bg-white/10 text-zinc-500"
              }`}
            >
              {i < step ? <IconCheck className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                i === step ? "font-medium text-white" : "text-zinc-500"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 hidden h-px w-4 bg-white/10 sm:block" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      {errors.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <ul className="list-disc pl-5 space-y-1">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              Choose a package
            </h2>
            <p className="mt-1 text-sm text-ca-muted">
              Audio-only or audio + video — never video without audio. Refine
              details after we confirm availability.
            </p>
            <div className="mt-6 grid gap-3">
              {packages.map((p) => {
                const on = form.packageId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, packageId: p.id }))}
                    className={`rounded-xl border p-5 text-left transition-all ${
                      on
                        ? "border-ca-gold/50 bg-ca-gold/10 ring-1 ring-ca-gold/40"
                        : "border-white/10 bg-ca-ink/40 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display font-semibold text-white">
                          {p.name}
                          {p.popular && (
                            <span className="ml-2 text-xs font-sans font-medium text-ca-gold">
                              Popular
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-ca-muted">{p.tagline}</p>
                        <div className="mt-2">
                          <ModeBadge mode={p.mode} />
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-ca-gold">
                        from {formatMoney(p.priceFrom)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Event details
            </h2>
            <label className="block">
              <span className="text-sm text-white">Artist / event name *</span>
              <input
                className="ca-field"
                value={form.artistOrEvent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, artistOrEvent: e.target.value }))
                }
                placeholder="e.g. Northbound · Album release show"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-white">Event date *</span>
                <input
                  type="date"
                  className="ca-field"
                  value={form.eventDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, eventDate: e.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-sm text-white">Set length</span>
                <select
                  className="ca-field"
                  value={form.setLength}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, setLength: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  <option>Under 45 min</option>
                  <option>45–90 min</option>
                  <option>90–120 min</option>
                  <option>Full festival day</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-white">Venue *</span>
                <input
                  className="ca-field"
                  value={form.venue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, venue: e.target.value }))
                  }
                  placeholder="Venue name"
                />
              </label>
              <label className="block">
                <span className="text-sm text-white">City</span>
                <input
                  className="ca-field"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="Sacramento, CA"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-white">Notes for the crew</span>
              <textarea
                rows={3}
                className="ca-field"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Load-in time, house rules, must-capture songs, FOH contact…"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Your contact
            </h2>
            <label className="block">
              <span className="text-sm text-white">Full name *</span>
              <input
                className="ca-field"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-white">Email *</span>
                <input
                  type="email"
                  className="ca-field"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="text-sm text-white">Phone *</span>
                <input
                  type="tel"
                  className="ca-field"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-white">Label / venue / company</span>
              <input
                className="ca-field"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Review request
            </h2>
            <p className="text-sm text-ca-muted">
              This submits a booking request — not a final charge. We&apos;ll
              send a confirmation and kit plan next.
            </p>
            <dl className="divide-y divide-white/10 rounded-xl border border-white/10 bg-ca-ink/50 text-sm">
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                <dt className="text-zinc-500">Package</dt>
                <dd className="sm:col-span-2 text-white">
                  {selected?.name} · from{" "}
                  {selected ? formatMoney(selected.priceFrom) : "—"}
                  {selected && (
                    <span className="ml-2 text-xs text-zinc-500">
                      (
                      {selected.mode === "audio"
                        ? "Audio only"
                        : "Audio + Video"}
                      )
                    </span>
                  )}
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                <dt className="text-zinc-500">Event</dt>
                <dd className="sm:col-span-2 text-white">
                  {form.artistOrEvent}
                  <br />
                  {form.eventDate} · {form.venue}
                  {form.city ? `, ${form.city}` : ""}
                  {form.setLength ? ` · ${form.setLength}` : ""}
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                <dt className="text-zinc-500">Contact</dt>
                <dd className="sm:col-span-2 text-white">
                  {form.name}
                  {form.company ? ` · ${form.company}` : ""}
                  <br />
                  {form.email} · {form.phone}
                </dd>
              </div>
              {form.notes && (
                <div className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                  <dt className="text-zinc-500">Notes</dt>
                  <dd className="sm:col-span-2 text-ca-muted whitespace-pre-wrap">
                    {form.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between border-t border-white/8 pt-6">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => {
            setErrors([]);
            setStep((s) => Math.max(0, s - 1));
          }}
          className="ca-btn ca-btn-ghost disabled:opacity-30"
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button type="button" onClick={next} className="ca-btn ca-btn-primary">
            Continue <IconArrow className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={submit} className="ca-btn ca-btn-primary">
            Submit booking request <IconCheck className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
