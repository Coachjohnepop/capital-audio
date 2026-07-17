import type { Metadata } from "next";
import { ReviewPlayer } from "@/components/review/review-player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review your footage | Capital Audio",
  robots: { index: false, follow: false },
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-ca-ink">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2.5 px-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ca-gold/40 bg-ca-gold/10">
            <span className="font-display text-sm font-bold text-ca-gold">CA</span>
          </span>
          <div>
            <div className="font-display text-lg font-semibold tracking-tight text-white">
              Capital Audio
            </div>
            <div className="-mt-0.5 text-[10px] uppercase tracking-widest text-ca-muted">
              Client Review
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ReviewPlayer id={id} />
      </main>
    </div>
  );
}
