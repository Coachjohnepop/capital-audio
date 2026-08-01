"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { useCapability } from "@/components/capability-provider";

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/gear", label: "Gear" },
  { href: "/about", label: "About" },
  { href: "/portal", label: "Portal" },
];

function studioLinks(videoOn: boolean) {
  return [
    { href: "/admin", label: "Dashboard", desc: "Overview & mode" },
    { href: "/admin/media", label: "Media", desc: "Library, trim, review links" },
    ...(videoOn
      ? [
          {
            href: "/admin/sync-editor",
            label: "Multi-angle sync",
            desc: "Line cameras to master audio",
          },
        ]
      : []),
    {
      href: "/admin/edits",
      label: "Timeline",
      desc: "Cut the show together",
    },
    { href: "/admin/settings", label: "Settings", desc: "Audio only / Audio + Video" },
  ];
}

export function SiteHeader() {
  const pathname = usePathname();
  const { videoOn } = useCapability();
  const [open, setOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [mobileStudioOpen, setMobileStudioOpen] = useState(false);
  const studioRef = useRef<HTMLDivElement>(null);

  const studio = studioLinks(videoOn);
  const studioActive = pathname.startsWith("/admin");

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!studioRef.current?.contains(e.target as Node)) {
        setStudioOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStudioOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="ca-shell-header">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandMark wordmark="Capital Audio" />

        <nav className="hidden items-center gap-0.5 md:flex">
          {/* Services */}
          <Link
            href="/#services"
            className="ca-tab"
          >
            Services
          </Link>

          {/* Studio dropdown */}
          <div className="relative" ref={studioRef}>
            <button
              type="button"
              className="ca-tab"
              data-active={studioActive || undefined}
              aria-expanded={studioOpen}
              aria-haspopup="menu"
              onClick={() => setStudioOpen((v) => !v)}
            >
              Studio
              <svg
                viewBox="0 0 16 16"
                className={`h-3.5 w-3.5 opacity-70 transition-transform ${
                  studioOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                <path
                  fill="currentColor"
                  d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06z"
                />
              </svg>
            </button>

            {studioOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-ca-panel/95 py-2 shadow-2xl shadow-black/50 backdrop-blur-md"
              >
                <div className="border-b border-white/6 px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ca-gold">
                    Studio
                  </p>
                  <p className="mt-0.5 text-xs text-ca-muted">
                    Capture tools · edit · deliver
                  </p>
                </div>
                {studio.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setStudioOpen(false)}
                      className={`block px-4 py-2.5 transition-colors ${
                        active
                          ? "bg-ca-gold/10 text-ca-gold"
                          : "text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="block text-xs text-ca-muted">
                        {item.desc}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {nav
            .filter((item) => item.href !== "/#services")
            .map((item) => {
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
            <Link
              href="/#services"
              onClick={() => setOpen(false)}
              className="ca-tab"
            >
              Services
            </Link>

            <button
              type="button"
              className="ca-tab justify-between"
              data-active={studioActive || undefined}
              onClick={() => setMobileStudioOpen((v) => !v)}
              aria-expanded={mobileStudioOpen}
            >
              Studio
              <span className="text-xs text-ca-muted">
                {mobileStudioOpen ? "−" : "+"}
              </span>
            </button>
            {mobileStudioOpen && (
              <div className="mb-1 ml-3 border-l border-white/10 pl-3">
                {studio.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="ca-tab block"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {nav
              .filter((item) => item.href !== "/#services")
              .map((item) => (
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
