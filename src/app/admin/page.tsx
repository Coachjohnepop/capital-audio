import Link from "next/link";
import { formatBytes, listMedia } from "@/lib/media";
import { listLeads, listQuotes } from "@/lib/crm";
import { CapabilityToggle } from "@/components/admin/capability-toggle";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [media, leads, quotes] = await Promise.all([
    listMedia(),
    listLeads().catch(() => []),
    listQuotes().catch(() => []),
  ]);
  const videos = media.filter((m) => m.kind === "video");
  const audio = media.filter((m) => m.kind === "audio");
  const totalBytes = media.reduce((sum, m) => sum + m.size, 0);
  const recent = media.slice(0, 5);
  const openLeads = leads.filter(
    (l) => l.status !== "won" && l.status !== "lost",
  ).length;

  const stats = [
    { label: "Open leads", value: String(openLeads) },
    { label: "Quotes", value: String(quotes.length) },
    { label: "Audio files", value: String(audio.length) },
    { label: "Video files", value: String(videos.length) },
    { label: "Storage used", value: formatBytes(totalBytes) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Studio"
        title="Dashboard"
        description="Upload captures, prep edits, stage review links, and track delivery. Toggle mode for audio-only vs audio + video tools."
        actions={
          <>
            <Link href="/portal" className="ca-btn ca-btn-secondary">
              Client portal
            </Link>
            <Link href="/admin/media" className="ca-btn ca-btn-primary">
              Media library
            </Link>
          </>
        }
      />

      <CapabilityToggle />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="ca-card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {s.label}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold text-ca-gold">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/leads" className="ca-card p-5 transition hover:border-ca-gold/40">
          <p className="font-display text-lg font-semibold text-white">Leads</p>
          <p className="mt-1 text-sm text-ca-muted">
            Track booking inquiries and pipeline status.
          </p>
        </Link>
        <Link href="/admin/quotes" className="ca-card p-5 transition hover:border-ca-gold/40">
          <p className="font-display text-lg font-semibold text-white">
            Quotes &amp; invoices
          </p>
          <p className="mt-1 text-sm text-ca-muted">
            Rack rate + launch discount — Stage Ready multi-cam $700 template.
          </p>
        </Link>
      </div>

      <div className="ca-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-white">
            Recent uploads
          </h2>
          <Link
            href="/admin/media"
            className="text-sm font-medium text-ca-gold hover:underline"
          >
            Open library →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-white/12 bg-ca-ink/40 px-5 py-10 text-center">
            <p className="text-sm text-ca-muted">
              Nothing here yet — upload multi-track audio (or video when mode is
              on) in the media library.
            </p>
            <Link href="/admin/media" className="ca-btn ca-btn-primary mt-4">
              Upload media
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {recent.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/media/${m.id}`}
                  className="flex items-center justify-between gap-4 py-3.5 text-sm transition-colors hover:text-ca-gold"
                >
                  <span className="truncate text-white">{m.title}</span>
                  <span className="shrink-0 text-xs text-ca-muted">
                    {m.kind} · {formatBytes(m.size)} ·{" "}
                    {new Date(m.uploadedAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
