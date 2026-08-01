"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/ui/brand-mark";
import { site } from "@/lib/site";
import { demoCustomer } from "@/lib/portal";

const links = [
  { href: "/portal", label: "Overview", exact: true },
  { href: "/portal/projects", label: "Projects" },
  { href: "/portal/bookings", label: "Bookings" },
  { href: "/portal/account", label: "Account" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <header className="ca-shell-header">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4 border-b border-white/5">
          <BrandMark
            href="/portal"
            wordmark="Portal"
            subtitle="Capital Audio"
            size="sm"
          />
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            <span className="hidden text-ca-muted sm:inline">
              {demoCustomer.name}
            </span>
            <a
              href={`tel:${site.phoneTel}`}
              className="hidden text-ca-gold transition-colors hover:text-ca-gold-light md:inline"
            >
              {site.phone}
            </a>
            <Link href="/portal/login" className="ca-btn ca-btn-secondary ca-btn-sm">
              Sign out
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 py-2.5">
          <nav className="ca-scroll flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
            {links.map((l) => {
              const active = l.exact
                ? pathname === l.href
                : pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="ca-tab"
                  data-active={active || undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/book" className="ca-btn ca-btn-primary ca-btn-sm shrink-0">
            Book a shoot
          </Link>
        </div>
      </div>
    </header>
  );
}
