"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/ui/brand-mark";

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/gear", label: "Gear" },
  { href: "/about", label: "About" },
  { href: "/portal", label: "Portal" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="ca-shell-header">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandMark wordmark="Capital Audio" />

        <nav className="hidden items-center gap-0.5 md:flex">
          {nav.map((item) => {
            const active =
              !item.href.startsWith("/#") &&
              (pathname === item.href ||
                pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="ca-tab"
                data-active={active || undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <Link href="/book" className="ca-btn ca-btn-primary ca-btn-sm ml-3">
            Book a shoot
          </Link>
        </nav>

        <button
          type="button"
          className="ca-btn ca-btn-secondary ca-btn-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/8 bg-ca-panel/95 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="ca-tab"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="ca-btn ca-btn-primary mt-3 w-full"
            >
              Book a shoot
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
