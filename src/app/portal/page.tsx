import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { IconArrow } from "@/components/icons";
import { ModeBadge } from "@/components/ui/mode-badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  demoCustomer,
  demoProjects,
  formatCurrency,
  formatDate,
  projectStatusLabel,
  projectStatusTone,
} from "@/lib/portal";

export const metadata: Metadata = {
  title: "Portal",
};

export default function PortalHomePage() {
  const open = demoProjects.filter((p) => p.status !== "delivered");
  const needsReview = demoProjects.find((p) => p.status === "review-ready");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Client portal"
        title={`Welcome, ${demoCustomer.name.split(" ")[0]}`}
        description="Track captures, edits, and deliverables in one place."
        actions={
          <Link href="/book" className="ca-btn ca-btn-primary">
            Book a shoot
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active projects" value={String(open.length)} />
        <StatCard
          label="Delivered"
          value={String(demoProjects.filter((p) => p.status === "delivered").length)}
        />
        <div className="rounded-2xl border border-ca-gold/25 bg-ca-gold/10 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ca-gold/80">
            Action needed
          </p>
          <p className="mt-2 text-sm leading-snug text-white">
            {needsReview
              ? `Review ready: ${needsReview.title}`
              : "You're all caught up"}
          </p>
          {needsReview && (
            <Link
              href={`/portal/projects/${needsReview.id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ca-gold hover:underline"
            >
              Open project <IconArrow className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">
            Projects
          </h2>
          <Link
            href="/portal/projects"
            className="text-sm font-medium text-ca-gold hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="space-y-3">
          {demoProjects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/portal/projects/${p.id}`}
                className="ca-card ca-card-hover flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{p.id}</span>
                    <StatusBadge
                      label={projectStatusLabel[p.status]}
                      tone={projectStatusTone[p.status]}
                    />
                    <ModeBadge mode={p.mode} />
                  </div>
                  <p className="mt-1.5 truncate font-medium text-white">
                    {p.title}
                  </p>
                  <p className="mt-1 text-sm text-ca-muted">
                    {p.packageName} · {p.venue}
                  </p>
                </div>
                <div className="shrink-0 text-sm text-ca-muted sm:text-right">
                  {p.estimateTotal != null && (
                    <p className="font-semibold text-white">
                      {formatCurrency(p.estimateTotal)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs">
                    Updated {formatDate(p.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ca-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
