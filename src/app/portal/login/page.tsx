import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Portal Login",
};

export default function PortalLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="ca-card p-8 shadow-2xl shadow-black/40">
        <BrandMark href="/" wordmark="Capital Audio" subtitle="Client portal" size="sm" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-white">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ca-muted">
          Track bookings, capture nights, edits, and review links for your
          projects.
        </p>

        <form className="mt-8 space-y-4" action="/portal" method="get">
          <label className="block">
            <span className="text-sm font-medium text-white">Email</span>
            <input
              type="email"
              name="email"
              defaultValue="alex.morgan@example.com"
              className="ca-field"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-white">Password</span>
            <input
              type="password"
              name="password"
              defaultValue="demo"
              className="ca-field"
            />
          </label>
          <p className="text-xs text-zinc-500">
            Demo mode — any credentials work. Pre-filled with sample customer
            data.
          </p>
          <button type="submit" className="ca-btn ca-btn-primary w-full py-3">
            Enter portal
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ca-muted">
          New capture?{" "}
          <Link href="/book" className="font-medium text-ca-gold hover:underline">
            Book a shoot
          </Link>
          {" · "}
          <a href={`mailto:${site.email}`} className="hover:text-white">
            Contact
          </a>
        </p>
      </div>
    </div>
  );
}
