import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/gear", label: "Gear" },
  { href: "/about", label: "About" },
  { href: "/portal", label: "Portal" },
];

export function SiteHeader() {
  return (
    <header className="ca-shell-header">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandMark wordmark="Capital Audio" />

        <nav className="flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="ca-tab shrink-0">
              {item.label}
            </Link>
          ))}
          <Link
            href="/book"
            className="ca-btn ca-btn-primary ca-btn-sm ml-2 shrink-0"
          >
            Book a shoot
          </Link>
        </nav>
      </div>
    </header>
  );
}
