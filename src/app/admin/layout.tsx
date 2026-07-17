import Link from "next/link";
import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "Studio Admin | Capital Audio",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ca-ink">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ca-ink/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full border border-ca-gold/40 bg-ca-gold/10">
              <span className="font-display text-sm font-bold text-ca-gold">CA</span>
            </Link>
            <div>
              <div className="font-display text-lg font-semibold tracking-tight text-white">
                Studio Admin
              </div>
              <div className="-mt-0.5 text-[10px] uppercase tracking-widest text-ca-muted">
                Capital Audio
              </div>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
