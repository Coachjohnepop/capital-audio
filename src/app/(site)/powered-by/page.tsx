import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Powered by Lemon Voice · ${site.name}`,
  description:
    "Capital Audio — live multi-track capture, multicam sync, timeline studio, and client portal — built with Lemon Voice.",
  robots: { index: true, follow: true },
};

const STACK = [
  {
    title: "Media library",
    body: "Import multi-cam video and board audio straight to durable cloud storage — preview, trim, and share review links.",
  },
  {
    title: "Multicam sync",
    body: "Line cameras to master audio with offsets and waveform tools so every angle locks to the board.",
  },
  {
    title: "Timeline studio",
    body: "GarageBand-style parallel tracks for video + multi-track audio — cut the show without leaving the browser.",
  },
  {
    title: "Client portal",
    body: "Bookings, milestones, review notes at timestamps, and masters delivery — one place for artists and venues.",
  },
  {
    title: "Capability modes",
    body: "Audio-only or audio + video packages — never video without usable sound.",
  },
  {
    title: "Production kit",
    body: "Right recorders, cameras, and glass for each date — crews show up ready for the room.",
  },
] as const;

export default function PoweredByPage() {
  return (
    <div className="min-h-[70vh] ca-grid">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BrandMark href="/" wordmark={site.name} subtitle="Live capture" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Powered by{" "}
            <a
              href={site.lemonvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ca-gold hover:underline"
            >
              Lemon Voice
            </a>
          </p>
        </div>

        <p className="mt-12 ca-eyebrow">The platform behind this studio</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
          Live capture software built for the room
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ca-muted sm:text-lg">
          Everything powering{" "}
          <strong className="text-white">{site.name}</strong> — media import,
          multicam sync, timeline edit, and client delivery — was designed for
          real shows in Sacramento and beyond. Built and maintained with{" "}
          <a
            href={site.lemonvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ca-gold hover:underline"
          >
            Lemon Voice
          </a>
          .
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {STACK.map((item) => (
            <div key={item.title} className="ca-card p-5">
              <h2 className="font-display text-base font-semibold text-white">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ca-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-ca-gold/25 bg-ca-elevated/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ca-gold">
              Want a system like this?
            </p>
            <p className="mt-2 max-w-md text-sm text-ca-muted">
              Lemon Voice rebuilds how businesses run — custom software around
              how you actually make money.
            </p>
          </div>
          <a
            href={site.lemonvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ca-btn ca-btn-primary shrink-0"
          >
            Visit Lemon Voice
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/8 pt-8">
          <Image
            src="/lemonvoice-logo-white.webp"
            alt="Lemon Voice"
            width={140}
            height={32}
            className="h-6 w-auto opacity-80"
          />
          <Link
            href="/"
            className="text-sm text-ca-muted transition-colors hover:text-ca-gold"
          >
            ← Back to {site.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
