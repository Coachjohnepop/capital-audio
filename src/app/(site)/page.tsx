import Image from "next/image";
import Link from "next/link";
import { IconArrow, IconCheck, ServiceIcon } from "@/components/icons";
import { ModeBadge } from "@/components/ui/mode-badge";
import { SectionHeader } from "@/components/ui/section-header";
import {
  formatMoney,
  packages,
  processSteps,
  services,
  site,
} from "@/lib/site";

const audioPackages = packages.filter((p) => p.mode === "audio");
const videoPackages = packages.filter((p) => p.mode === "audio-video");

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80"
            alt="Live concert stage lights"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ca-ink/75 via-ca-ink/80 to-ca-ink" />
          <div className="absolute inset-0 ca-noise opacity-40" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-ca-gold" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Multi-track audio · multi-cam when you need it
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl lg:text-6xl">
            Your show,{" "}
            <span className="text-ca-gold italic">captured like it sounded</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
            {site.description}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/book" className="ca-btn ca-btn-primary ca-btn-lg">
              Book a shoot
              <IconArrow className="h-5 w-5" />
            </Link>
            <Link href="/packages" className="ca-btn ca-btn-secondary ca-btn-lg">
              View packages
            </Link>
          </div>
          <p className="mt-8 text-sm text-zinc-400">{site.location}</p>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-white/8 bg-ca-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeader
            eyebrow="What we do"
            title="Audio first. Video when the show needs it."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <div
                key={s.title}
                className="ca-card ca-card-hover p-7"
              >
                <span className="inline-flex rounded-xl bg-ca-gold/10 p-3 text-ca-gold ring-1 ring-ca-gold/25">
                  <ServiceIcon name={s.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ca-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeader
            eyebrow="Packages"
            title="Clear pricing. Serious deliverables."
            href="/packages"
            linkLabel="Full package details →"
          />

          <PackageGroup
            label="Audio only"
            hint="Board feeds & multi-track — no cameras required"
            items={audioPackages}
          />
          <PackageGroup
            label="Audio + Video"
            hint="Picture always rides with usable sound"
            items={videoPackages}
            className="mt-12"
          />
        </div>
      </section>

      {/* Process */}
      <section className="border-t border-white/8 bg-ca-panel/30 ca-grid">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeader
            eyebrow="How it works"
            title="From booking to masters"
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((s, i) => (
              <div key={s.n} className="ca-card relative p-6">
                {i < processSteps.length - 1 && (
                  <span className="pointer-events-none absolute -right-2 top-10 hidden h-px w-4 bg-ca-gold/30 lg:block" />
                )}
                <span className="font-mono text-sm text-ca-gold">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ca-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Production kit */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="ca-eyebrow">Production kit</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
                Pro gear matched to the room
              </h2>
              <p className="mt-4 leading-relaxed text-ca-muted">
                We don&apos;t ask you to rent blindly. Capital Audio shows up
                with cameras, glass, and multi-track audio — insured, pro-grade
                kit matched to the room.
              </p>
              <Link
                href="/gear"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ca-gold hover:text-ca-gold-light"
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
              <div className="absolute inset-0 bg-gradient-to-t from-ca-ink/85 via-ca-ink/20 to-transparent" />
              <p className="absolute bottom-4 left-4 right-4 text-sm text-zinc-200">
                Cameras · lenses · multi-track recorders · lighting support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-ca-gold/25 bg-gradient-to-br from-ca-elevated to-ca-ink p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ca-gold/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-ca-gold/5 blur-3xl" />
            <h2 className="relative font-display text-3xl font-semibold text-white sm:text-4xl">
              Ready to lock a date?
            </h2>
            <p className="relative mt-3 max-w-xl text-ca-muted">
              Tell us about the show. We&apos;ll confirm crew, kit, and a clear
              quote — usually within one business day.
            </p>
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="ca-btn ca-btn-primary ca-btn-lg">
                Start booking <IconArrow className="h-4 w-4" />
              </Link>
              <a href={`mailto:${site.email}`} className="ca-btn ca-btn-secondary ca-btn-lg">
                {site.email}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PackageGroup({
  label,
  hint,
  items,
  className = "",
}: {
  label: string;
  hint: string;
  items: typeof packages;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-5 flex flex-wrap items-baseline gap-3">
        <h3 className="font-display text-lg font-semibold text-white">{label}</h3>
        <p className="text-sm text-zinc-500">{hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col p-6 ${
              p.popular ? "ca-card ca-card-featured" : "ca-card ca-card-hover"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-2.5 left-5 ca-pill ca-pill-solid">
                Most booked
              </span>
            )}
            <ModeBadge mode={p.mode} emphasize={p.mode === "audio-video"} />
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">
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
            <ul className="mt-5 flex-1 space-y-2">
              {p.includes.slice(0, 4).map((item) => (
                <li key={item} className="flex gap-2 text-sm text-zinc-300">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-ca-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={`/book?package=${p.id}`}
              className={`mt-7 ca-btn w-full ${
                p.popular ? "ca-btn-primary" : "ca-btn-secondary"
              }`}
            >
              Book {p.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
