import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { demoCustomer } from "@/lib/portal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Account",
};

export default function PortalAccountPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Account"
        description="Demo profile — real auth lands later."
      />
      <div className="ca-card max-w-lg space-y-5 p-6">
        <Row label="Name" value={demoCustomer.name} />
        <Row label="Email" value={demoCustomer.email} />
        <Row label="Phone" value={demoCustomer.phone} />
        {demoCustomer.companyName && (
          <Row label="Company" value={demoCustomer.companyName} />
        )}
      </div>
      <p className="text-sm text-ca-muted">
        Need help?{" "}
        <a
          href={`mailto:${site.email}`}
          className="text-ca-gold hover:underline"
        >
          {site.email}
        </a>{" "}
        ·{" "}
        <a
          href={`tel:${site.phoneTel}`}
          className="text-ca-gold hover:underline"
        >
          {site.phone}
        </a>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/6 pb-4 last:border-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}
