import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name} — professional live music video and audio capture.`,
};

export default function AboutPage() {
  return (
    <div className="ca-grid">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
          About
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-white sm:text-5xl">
          {site.name}
        </h1>
        <div className="mt-8 space-y-5 text-ca-muted leading-relaxed">
          <p className="text-lg text-zinc-300">
            Capital Audio exists for one job: make live music look and sound as
            good on screen as it did in the room.
          </p>
          <p>
            We run multi-cam video and multi-track audio for clubs, theaters,
            houses of worship, festivals, and private events. Production gear is
            coordinated through ShareGrid so every date has the right cinema
            bodies, glass, and recorders — without you managing the rental
            logistics.
          </p>
          <p>
            Based in the {site.location.split("·")[0].trim()} area and available
            to travel. Whether you need a tight single-cam document of a
            songwriter night or a festival-scale crew, we book cleanly and
            deliver masters you can actually use.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-ca-panel/60 p-6">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Email
            </p>
            <a
              href={`mailto:${site.email}`}
              className="mt-2 block text-ca-gold hover:underline"
            >
              {site.email}
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 bg-ca-panel/60 p-6">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Phone
            </p>
            <a
              href={`tel:${site.phoneTel}`}
              className="mt-2 block text-ca-gold hover:underline"
            >
              {site.phone}
            </a>
          </div>
        </div>

        <Link
          href="/book"
          className="mt-10 inline-flex rounded-full bg-ca-gold px-7 py-3.5 text-sm font-semibold text-ca-ink hover:bg-ca-gold-light"
        >
          Book a shoot
        </Link>
      </div>
    </div>
  );
}
