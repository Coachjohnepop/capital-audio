import Link from "next/link";
import { formatBytes, listMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const media = await listMedia();
  const videos = media.filter((m) => m.kind === "video");
  const audio = media.filter((m) => m.kind === "audio");
  const totalBytes = media.reduce((sum, m) => sum + m.size, 0);
  const recent = media.slice(0, 5);

  const stats = [
    { label: "Video files", value: videos.length },
    { label: "Audio files", value: audio.length },
    { label: "Storage used", value: formatBytes(totalBytes) },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-ca-muted">
        Upload show footage, prep edits, and stage deliverables for clients.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ca-border bg-ca-panel p-5">
            <div className="text-xs uppercase tracking-widest text-ca-muted">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-semibold text-ca-gold">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-ca-border bg-ca-panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-white">Recent uploads</h2>
          <Link
            href="/admin/media"
            className="rounded-full bg-ca-gold px-4 py-2 text-sm font-semibold text-ca-ink transition-colors hover:bg-ca-gold-light"
          >
            Open media library
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-ca-muted">
            Nothing here yet — upload your first video or multi-track bounce in the media
            library.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {recent.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/media/${m.id}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-ca-gold"
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
