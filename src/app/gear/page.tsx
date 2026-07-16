import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, gearCatalog, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gear · ShareGrid",
  description:
    "Sample production kit for Capital Audio live captures — cameras, lenses, and multi-track audio coordinated via ShareGrid.",
};

const categories = ["Camera", "Lens", "Audio", "Lighting", "Support"] as const;

export default function GearPage() {
  return (
    <div className="ca-grid">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
          Production kit
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-white sm:text-5xl">
          Gear via ShareGrid
        </h1>
        <p className="mt-4 max-w-2xl text-ca-muted leading-relaxed">
          We reserve pro cameras, glass, and audio for each shoot through{" "}
          <a
            href={site.sharegridUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ca-gold hover:underline"
          >
            ShareGrid
          </a>
          . Below is a representative kit list — exact models are locked once
          your date is confirmed.
        </p>

        <div className="mt-6 rounded-xl border border-ca-gold/20 bg-ca-gold/5 px-5 py-4 text-sm text-zinc-300">
          Day rates shown are typical ShareGrid market ranges for client
          planning. Final kit is included in your package quote.
        </div>

        <div className="mt-12 space-y-10">
          {categories.map((cat) => {
            const items = gearCatalog.filter((g) => g.category === cat);
            if (!items.length) return null;
            return (
              <section key={cat}>
                <h2 className="font-display text-xl font-semibold text-white">
                  {cat}
                </h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-ca-elevated text-xs uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="hidden px-4 py-3 font-medium sm:table-cell">
                          Notes
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          ~Day rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-ca-panel/40">
                      {items.map((g) => (
                        <tr key={g.id} className="hover:bg-white/[0.03]">
                          <td className="px-4 py-4">
                            <p className="font-medium text-white">{g.name}</p>
                            <p className="mt-1 text-xs text-zinc-500 sm:hidden">
                              {g.note}
                            </p>
                            {g.sharegrid && (
                              <span className="mt-1 inline-block text-[10px] uppercase tracking-wider text-ca-gold/80">
                                ShareGrid
                              </span>
                            )}
                          </td>
                          <td className="hidden px-4 py-4 text-ca-muted sm:table-cell">
                            {g.note}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-zinc-200">
                            {formatMoney(g.dayRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-14 rounded-2xl border border-white/10 bg-ca-panel p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-white">
            Need a specific body or glass?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ca-muted">
            Tell us in the booking notes — we&apos;ll check ShareGrid
            availability for your date.
          </p>
          <Link
            href="/book"
            className="mt-6 inline-flex rounded-full bg-ca-gold px-6 py-3 text-sm font-semibold text-ca-ink hover:bg-ca-gold-light"
          >
            Book with custom kit notes
          </Link>
        </div>
      </div>
    </div>
  );
}
