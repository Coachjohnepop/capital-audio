import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { IconCheck } from "@/components/icons";
import { ModeBadge } from "@/components/ui/mode-badge";
import {
  demoProjects,
  formatCurrency,
  formatDate,
  projectStatusLabel,
  projectStatusTone,
} from "@/lib/portal";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = demoProjects.find((p) => p.id === id);
  return { title: project?.title ?? "Project" };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = demoProjects.find((p) => p.id === id);
  if (!project) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/portal/projects"
          className="text-sm font-medium text-ca-gold hover:underline"
        >
          ← All projects
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-zinc-500">{project.id}</span>
          <StatusBadge
            label={projectStatusLabel[project.status]}
            tone={projectStatusTone[project.status]}
          />
          <ModeBadge mode={project.mode} emphasize={project.mode === "audio-video"} />
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          {project.title}
        </h1>
        <p className="mt-2 text-sm text-ca-muted">{project.venue}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="ca-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Estimate
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-white">
            {project.estimateTotal != null
              ? formatCurrency(project.estimateTotal)
              : "Pending"}
          </p>
        </div>
        <div className="ca-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Capture night
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-white">
            {project.eventDate ? formatDate(project.eventDate) : "TBD"}
          </p>
        </div>
        <div className="ca-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Package
          </p>
          <p className="mt-2 font-display text-xl font-semibold text-white">
            {project.packageName}
          </p>
        </div>
      </div>

      {project.status === "review-ready" && (
        <section className="rounded-2xl border border-ca-gold/30 bg-ca-gold/10 p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Ready for your notes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ca-muted">
            Masters are staged for review. Open the review link from the studio
            email, or ask us to resend it. Timestamp notes land next to the
            media in Studio Admin.
          </p>
        </section>
      )}

      <section className="ca-card p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Milestones
        </h2>
        <ol className="mt-6 space-y-4">
          {project.milestones.map((m) => {
            const done = Boolean(m.completedAt);
            return (
              <li key={m.id} className="flex gap-4">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-ca-gold text-ca-ink"
                      : "border border-white/15 text-ca-muted"
                  }`}
                >
                  {done ? <IconCheck className="h-4 w-4" /> : null}
                </span>
                <div>
                  <p
                    className={`font-medium ${
                      done ? "text-white" : "text-ca-muted"
                    }`}
                  >
                    {m.label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {m.completedAt
                      ? `Done ${formatDate(m.completedAt)}`
                      : m.dueAt
                        ? `Due ${formatDate(m.dueAt)}`
                        : "Upcoming"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {project.notes && (
        <section className="ca-card p-6">
          <h2 className="font-display text-lg font-semibold text-white">Notes</h2>
          <p className="mt-2 text-sm leading-relaxed text-ca-muted">
            {project.notes}
          </p>
        </section>
      )}

      {project.bookingId && (
        <p className="text-sm text-ca-muted">
          Booking reference:{" "}
          <Link href="/portal/bookings" className="text-ca-gold hover:underline">
            {project.bookingId}
          </Link>
        </p>
      )}
    </div>
  );
}
