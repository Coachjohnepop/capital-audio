import Image from "next/image";
import Link from "next/link";
import { IconArrow, IconCheck, ServiceIcon } from "@/components/icons";
import {
  formatMoney,
  packages,
  processSteps,
  services,
  site,
  testimonials,
} from "@/lib/site";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80"
            alt="Live concert stage lights"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ca-ink/80 via-ca-ink/75 to-ca-ink" />
          <div className="absolute inset-0 ca-noise opacity-40" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ca-gold">
            Live music video & multi-track audio
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            Your show,{" "}
            <span className="text-ca-gold italic">captured like it sounded</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-300 leading-relaxed">
            {site.description}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ca-gold px-8 py-3.5 text-base font-semibold text-ca-ink hover:bg-ca-gold-light transition-colors"
            >
              Book a shoot
              <IconArrow className="h-5 w-5" />
            </Link>
            <Link
              href="/packages"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-8 py-3.5 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              View packages
            </Link>
          </div>
          <p className="mt-8 text-sm text-zinc-400">
            Pro kit coordinated on{" "}
            <a
              href={site.sharegridUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ca-gold hover:underline"
            >
              ShareGrid
            </a>{" "}
            · {site.location}
          </p>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-white/10 bg-ca-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
            What we do
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
            Video and audio built for the stage
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {services.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-ca-ink/50 p-7 transition-colors hover:border-ca-gold/30"
              >
                <span className="inline-flex rounded-xl bg-ca-gold/10 p-3 text-ca-gold ring-1 ring-ca-gold/25">
                  <ServiceIcon name={s.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-ca-muted leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages teaser */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
                Packages
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
                Clear pricing. Serious deliverables.
              </h2>
            </div>
            <Link
              href="/packages"
              className="text-sm font-medium text-ca-gold hover:underline"
            >
              Full package details →
            </Link>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {packages.map((p) => (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  p.popular
                    ? "border-ca-gold/40 bg-gradient-to-b from-ca-gold/10 to-ca-panel"
                    : "border-white/10 bg-ca-panel/60"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-ca-gold px-3 py-0.5 text-xs font-bold text-ca-ink">
                    Most booked
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold text-white">
                  {p.name}
                </h3>
                <p className="mt-1 text-sm text-ca-muted">{p.tagline}</p>
                <p className="mt-5 font-display text-3xl font-semibold text-ca-gold">
                  {formatMoney(p.priceFrom)}
                  <span className="text-sm font-sans font-normal text-zinc-500">
                    {" "}
                    from
                  </span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.includes.slice(0, 4).map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm text-zinc-300"
                    >
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-ca-gold" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/book?package=${p.id}`}
                  className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition-colors ${
                    p.popular
                      ? "bg-ca-gold text-ca-ink hover:bg-ca-gold-light"
                      : "border border-white/20 text-white hover:bg-white/5"
                  }`}
                >
                  Book {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="border-t border-white/10 bg-ca-panel/30 ca-grid">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
            From booking to masters
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-ca-ink/70 p-6">
                <span className="font-mono text-sm text-ca-gold">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-ca-muted leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ShareGrid callout */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
                Production kit
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
                Cinema gear via ShareGrid
              </h2>
              <p className="mt-4 text-ca-muted leading-relaxed">
                We don&apos;t ask you to rent blindly. Capital Audio coordinates
                cameras, glass, and multi-track audio through ShareGrid — so every
                shoot has insured, pro-grade kit matched to the room.
              </p>
              <Link
                href="/gear"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ca-gold hover:underline"
              >
                Browse sample kit list <IconArrow className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80"
                alt="Professional recording studio equipment"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ca-ink/80 to-transparent" />
              <p className="absolute bottom-4 left-4 right-4 text-sm text-zinc-200">
                Cameras · lenses · multi-track recorders · lighting support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/10 bg-ca-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
            Client words
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-white">
            Built for artists, venues, and managers
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote
                key={t.name}
                className="flex flex-col rounded-2xl border border-white/10 bg-ca-ink/50 p-6"
              >
                <p className="flex-1 text-sm text-zinc-300 leading-relaxed">
                  “{t.quote}”
                </p>
                <footer className="mt-5">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-ca-gold/25 bg-gradient-to-br from-ca-elevated to-ca-ink p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ca-gold/10 blur-3xl" />
            <h2 className="relative font-display text-3xl font-semibold text-white sm:text-4xl">
              Ready to lock a date?
            </h2>
            <p className="relative mt-3 max-w-xl text-ca-muted">
              Tell us about the show. We&apos;ll confirm crew, ShareGrid kit, and
              a clear quote — usually within one business day.
            </p>
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ca-gold px-7 py-3.5 text-sm font-semibold text-ca-ink hover:bg-ca-gold-light"
              >
                Start booking <IconArrow className="h-4 w-4" />
              </Link>
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-white hover:bg-white/5"
              >
                {site.email}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
