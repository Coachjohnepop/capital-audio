import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { site } from "@/lib/site";

const explore = [
  { href: "/packages", label: "Packages" },
  { href: "/gear", label: "Gear · ShareGrid" },
  { href: "/book", label: "Book a shoot" },
  { href: "/portal", label: "Client portal" },
  { href: "/about", label: "About" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-ca-ink">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <BrandMark href="/" wordmark={site.name} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ca-muted">
            {site.tagline}. Multi-track audio first — multi-cam video when the
            show needs it.
          </p>
          <p className="mt-4 text-sm text-zinc-500">{site.location}</p>
        </div>

        <div className="md:col-span-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Explore
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {explore.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-ca-muted transition-colors hover:text-ca-gold"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Contact
          </p>
          <p className="mt-4 space-y-1 text-sm">
            <a
              href={`mailto:${site.email}`}
              className="block text-ca-muted transition-colors hover:text-ca-gold"
            >
              {site.email}
            </a>
            <a
              href={`tel:${site.phoneTel}`}
              className="block text-ca-muted transition-colors hover:text-ca-gold"
            >
              {site.phone}
            </a>
          </p>
          <p className="mt-6 text-xs leading-relaxed text-zinc-600">
            Production gear coordinated via{" "}
            <a
              href={site.sharegridUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ca-gold/80 transition-colors hover:text-ca-gold"
            >
              ShareGrid
            </a>
            .
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 py-5 text-center text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <p className="mt-2">
          Powered by{" "}
          <a
            href={site.lemonvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 transition-colors hover:text-ca-gold"
          >
            Lemon Voice
          </a>
        </p>
      </div>
    </footer>
  );
}
