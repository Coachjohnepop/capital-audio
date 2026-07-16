"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/gear", label: "Gear" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ca-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ca-gold/40 bg-ca-gold/10">
            <span className="font-display text-sm font-bold text-ca-gold">CA</span>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-white group-hover:text-ca-gold transition-colors">
            {site.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "text-ca-gold"
                    : "text-ca-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/book"
            className="ml-2 rounded-full bg-ca-gold px-5 py-2 text-sm font-semibold text-ca-ink hover:bg-ca-gold-light transition-colors"
          >
            Book a shoot
          </Link>
        </nav>

        <button
          type="button"
          className="md:hidden rounded-lg border border-white/15 px-3 py-2 text-sm text-white"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Menu
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ca-panel px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-ca-muted hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-ca-gold px-5 py-3 text-center text-sm font-semibold text-ca-ink"
            >
              Book a shoot
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
