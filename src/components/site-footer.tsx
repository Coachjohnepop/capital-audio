import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ca-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold text-white">{site.name}</p>
          <p className="mt-2 text-sm text-ca-muted leading-relaxed">{site.tagline}.</p>
          <p className="mt-4 text-sm text-ca-muted">{site.location}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Explore
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/packages" className="text-ca-muted hover:text-ca-gold">
                Packages
              </Link>
            </li>
            <li>
              <Link href="/gear" className="text-ca-muted hover:text-ca-gold">
                Gear · ShareGrid
              </Link>
            </li>
            <li>
              <Link href="/book" className="text-ca-muted hover:text-ca-gold">
                Book a shoot
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-ca-muted hover:text-ca-gold">
                About
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Contact
          </p>
          <p className="mt-4 text-sm text-ca-muted">
            <a href={`mailto:${site.email}`} className="hover:text-ca-gold">
              {site.email}
            </a>
            <br />
            <a href={`tel:${site.phoneTel}`} className="hover:text-ca-gold">
              {site.phone}
            </a>
          </p>
          <p className="mt-4 text-xs text-zinc-600">
            Production gear coordinated via{" "}
            <a
              href={site.sharegridUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ca-gold/80 hover:text-ca-gold"
            >
              ShareGrid
            </a>
            .
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
