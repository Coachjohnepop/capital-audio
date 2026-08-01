import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ModeBadge } from "@/components/ui/mode-badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  demoProjects,
  formatCurrency,
  formatDate,
  projectStatusLabel,
  projectStatusTone,
} from "@/lib/portal";

export const metadata: Metadata = {
  title: "Projects",
};

export default function PortalProjectsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Every capture from booking through masters."
      />
      <ul className="space-y-3">
        {demoProjects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/portal/projects/${p.id}`}
              className="ca-card ca-card-hover flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{p.id}</span>
                  <StatusBadge
                    label={projectStatusLabel[p.status]}
                    tone={projectStatusTone[p.status]}
                  />
                  <ModeBadge mode={p.mode} />
                </div>
                <p className="mt-1.5 font-medium text-white">{p.title}</p>
                <p className="mt-1 text-sm text-ca-muted">
                  {p.packageName}
                  {p.eventDate ? ` · ${formatDate(p.eventDate)}` : ""}
                </p>
              </div>
              <div className="text-sm text-ca-muted sm:text-right">
                {p.estimateTotal != null && (
                  <p className="font-semibold text-white">
                    {formatCurrency(p.estimateTotal)}
                  </p>
                )}
                <p className="mt-0.5 text-xs">Updated {formatDate(p.updatedAt)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
