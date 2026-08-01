"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCapability } from "@/components/capability-provider";
import { CapabilityToggle } from "@/components/admin/capability-toggle";

export function AdminNav() {
  const pathname = usePathname();
  const { videoOn } = useCapability();

  const nav = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/media", label: "Media" },
    ...(videoOn
      ? [{ href: "/admin/sync-editor", label: "Sync" }]
      : []),
    { href: "/admin/edits", label: "Timeline" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="ca-scroll flex max-w-full gap-0.5 overflow-x-auto pb-0.5">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
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
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <CapabilityToggle compact />
          <Link href="/portal" className="ca-btn ca-btn-ghost ca-btn-sm hidden sm:inline-flex">
            Portal
          </Link>
          <Link href="/" className="ca-btn ca-btn-secondary ca-btn-sm">
            Site
          </Link>
        </div>
      </div>
    </div>
  );
}
