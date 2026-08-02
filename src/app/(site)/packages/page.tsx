import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck } from "@/components/icons";
import { ModeBadge } from "@/components/ui/mode-badge";
import { formatMoney, packages } from "@/lib/site";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Live music capture packages — audio-only multi-track, single-cam, multi-cam stage ready, and festival crews.",
};

export default function PackagesPage() {
  const audio = packages.filter((p) => p.mode === "audio");
  const av = packages.filter((p) => p.mode === "audio-video");

  return (
    <div className="ca-grid ca-glow">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="ca-eyebrow">Packages</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-white sm:text-5xl">
          Capture packages
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ca-muted">
          Audio-only or audio + video — never video without audio. Every package
          includes crew, ShareGrid-sourced kit, and masters in your client
          portal. Travel may apply outside the Sacramento area.
        </p>

        <PackageSection title="Audio only" packages={audio} />
        <PackageSection title="Audio + Video" packages={av} className="mt-14" />
      </div>
    </div>
  );
}

function PackageSection({
  title,
  packages: list,
  className = "",
}: {
  title: string;
  packages: typeof packages;
  className?: string;
}) {
  return (
    <div className={`mt-14 ${className}`}>
      <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
      <div className="mt-6 space-y-6">
        {list.map((p) => (
          <article
            key={p.id}
            className={`grid gap-8 p-6 sm:p-8 lg:grid-cols-3 ${
              p.popular ? "ca-card ca-card-featured" : "ca-card"
            }`}
          >
            <div className="lg:col-span-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ModeBadge mode={p.mode} emphasize={p.mode === "audio-video"} />
                {p.popular && (
                  <span className="ca-pill ca-pill-solid">Most booked</span>
                )}
              </div>
              <h3 className="font-display text-3xl font-semibold text-white">
                {p.name}
              </h3>
              <p className="mt-2 text-ca-muted">{p.tagline}</p>
              <p className="mt-6 font-display text-4xl font-semibold text-ca-gold">
                {formatMoney(p.priceFrom)}
                <span className="text-base font-sans font-normal text-zinc-500">
                  {" "}
                  from
                </span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">Ideal for: {p.idealFor}</p>
              <p className="mt-1 text-sm text-zinc-500">
                Turnaround: {p.turnaround}
              </p>
              <Link
                href={`/book?package=${p.id}`}
                className="ca-btn ca-btn-primary mt-6"
              >
                Book this package
              </Link>
            </div>
            <div className="lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Includes
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {p.includes.map((item) => (
                  <li
                    key={item}
                    className="ca-inset flex gap-2.5 px-4 py-3 text-sm text-zinc-200"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-ca-gold" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
