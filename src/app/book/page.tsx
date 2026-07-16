import type { Metadata } from "next";
import { BookingForm } from "@/components/booking-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a shoot",
  description: `Request a Capital Audio live capture. ${site.location}.`,
};

type Props = {
  searchParams: Promise<{ package?: string }>;
};

export default async function BookPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <div className="ca-grid ca-glow">
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ca-gold">
          Booking
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-white">
          Book a shoot
        </h1>
        <p className="mt-3 text-ca-muted leading-relaxed">
          Four quick steps. We confirm crew and ShareGrid kit within one
          business day — no charge until you approve the quote.
        </p>
        <div className="mt-10">
          <BookingForm defaultPackage={params.package} />
        </div>
      </div>
    </div>
  );
}
