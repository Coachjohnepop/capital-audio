"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/sync-editor", label: "Multi-Angle Sync" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {nav.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "text-ca-gold" : "text-ca-muted hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="ml-2 rounded-full border border-white/15 px-4 py-2 text-sm text-ca-muted transition-colors hover:text-white"
      >
        View site
      </Link>
    </nav>
  );
}
