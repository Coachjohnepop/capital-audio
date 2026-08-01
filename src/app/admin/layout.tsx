import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { BrandMark } from "@/components/ui/brand-mark";

export const metadata: Metadata = {
  title: "Studio Admin | Capital Audio",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ca-ink">
      <div className="pointer-events-none fixed inset-0 ca-glow-soft opacity-80" />
      <header className="ca-shell-header relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4 border-b border-white/5">
            <BrandMark
              href="/admin"
              wordmark="Studio"
              subtitle="Capital Audio"
              size="sm"
            />
            <p className="hidden text-xs text-zinc-600 lg:block">
              Capture · edit · deliver
            </p>
          </div>
          <div className="py-2.5">
            <AdminNav />
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
