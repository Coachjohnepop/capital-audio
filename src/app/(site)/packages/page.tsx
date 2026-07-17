import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck } from "@/components/icons";
import { formatMoney, packages } from "@/lib/site";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Live music capture packages — single-cam, multi-cam stage ready, and festival crews with multi-track audio.",
};

export default function PackagesPage() {
  return (
    <div className="ca-grid ca-glow">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
          Packages
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-white sm:text-5xl">
          Capture packages
        </h1>
        <p className="mt-4 max-w-2xl text-ca-muted leading-relaxed">
          Every package includes crew, ShareGrid-sourced production kit, and
          deliverable masters. Travel may apply outside the DC metro.
        </p>

        <div className="mt-14 space-y-8">
          {packages.map((p) => (
            <article
              key={p.id}
              className={`grid gap-8 rounded-2xl border p-6 sm:p-8 lg:grid-cols-3 ${
                p.popular
                  ? "border-ca-gold/35 bg-ca-gold/5"
                  : "border-white/10 bg-ca-panel/50"
              }`}
            >
              <div className="lg:col-span-1">
                {p.popular && (
                  <span className="mb-3 inline-block rounded-full bg-ca-gold px-3 py-0.5 text-xs font-bold text-ca-ink">
                    Most booked
                  </span>
                )}
                <h2 className="font-display text-3xl font-semibold text-white">
                  {p.name}
                </h2>
                <p className="mt-2 text-ca-muted">{p.tagline}</p>
                <p className="mt-6 font-display text-4xl font-semibold text-ca-gold">
                  {formatMoney(p.priceFrom)}
                  <span className="text-base font-sans font-normal text-zinc-500">
                    {" "}
                    from
                  </span>
                </p>
                <p className="mt-3 text-sm text-zinc-400">
                  Ideal for: {p.idealFor}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Turnaround: {p.turnaround}
                </p>
                <Link
                  href={`/book?package=${p.id}`}
                  className="mt-6 inline-flex rounded-full bg-ca-gold px-6 py-3 text-sm font-semibold text-ca-ink hover:bg-ca-gold-light"
                >
                  Book this package
                </Link>
              </div>
              <div className="lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Includes
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {p.includes.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 rounded-xl border border-white/5 bg-ca-ink/40 px-4 py-3 text-sm text-zinc-200"
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
    </div>
  );
}
