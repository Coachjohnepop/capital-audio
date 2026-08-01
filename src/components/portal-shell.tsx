"use client";

import { usePathname } from "next/navigation";
import { PortalNav } from "@/components/portal-nav";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/portal/login";

  if (isLogin) {
    return (
      <div className="relative flex min-h-full flex-col bg-ca-ink">
        <div className="pointer-events-none absolute inset-0 ca-grid opacity-60" />
        <div className="pointer-events-none absolute inset-0 ca-glow" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-ca-ink">
      <div className="pointer-events-none fixed inset-0 ca-glow-soft" />
      <PortalNav />
      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
