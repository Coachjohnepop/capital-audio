"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ModeBadge } from "@/components/ui/mode-badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  BOOKINGS_STORAGE_KEY,
  bookingStatusLabel,
  bookingStatusTone,
  formatCurrency,
  formatDate,
  type BookingRecord,
  type BookingStatus,
} from "@/lib/portal";

export default function PortalBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      const list = raw ? (JSON.parse(raw) as BookingRecord[]) : [];
      setBookings(Array.isArray(list) ? list : []);
    } catch {
      setBookings([]);
    }
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bookings"
        description="Requests from the book form (demo · browser storage)."
        actions={
          <Link href="/book" className="ca-btn ca-btn-primary">
            New booking
          </Link>
        }
      />

      {bookings === null ? (
        <p className="text-sm text-ca-muted">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 bg-ca-panel/40 p-10 text-center">
          <p className="text-sm text-ca-muted">
            No bookings yet. Submit one from the book flow — it will show up
            here.
          </p>
          <Link href="/book" className="ca-btn ca-btn-primary mt-4">
            Book a shoot
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => {
            const status = (b.status ?? "pending-review") as BookingStatus;
            return (
              <li key={b.id} className="ca-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{b.id}</span>
                  <StatusBadge
                    label={bookingStatusLabel[status] ?? status}
                    tone={bookingStatusTone[status] ?? "neutral"}
                  />
                  {b.mode && <ModeBadge mode={b.mode} />}
                </div>
                <p className="mt-2 font-medium text-white">
                  {b.artistOrEvent || "Untitled event"}
                </p>
                <p className="mt-1 text-sm text-ca-muted">
                  {b.packageName ?? b.packageId}
                  {b.venue ? ` · ${b.venue}` : ""}
                  {b.eventDate ? ` · ${formatDate(b.eventDate)}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                  <span>{b.name}</span>
                  <span>{b.email}</span>
                  {b.priceFrom != null && (
                    <span className="text-white">
                      from {formatCurrency(b.priceFrom)}
                    </span>
                  )}
                  <span>Submitted {formatDate(b.createdAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
