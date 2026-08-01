"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ProjectRow {
  id: string;
  title: string;
  masterMediaId: string | null;
  masterTitle: string | null;
  angleCount: number;
  createdAt: string;
}

/**
 * DaVinci Resolve–style entry: Media Pool → Multicam Sync project.
 */
export function SyncEditorHome() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [mediaCount, setMediaCount] = useState({ video: 0, audio: 0 });

  const load = useCallback(async () => {
    const [projRes, mediaRes] = await Promise.all([
      fetch("/api/admin/sync-projects"),
      fetch("/api/admin/media"),
    ]);
    if (projRes.ok) {
      const data = (await projRes.json()) as { projects: ProjectRow[] };
      setProjects(data.projects);
    }
    if (mediaRes.ok) {
      const list = (await mediaRes.json()) as { kind: string }[];
      setMediaCount({
        video: list.filter((m) => m.kind === "video").length,
        audio: list.filter((m) => m.kind === "audio").length,
      });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/sync-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Multicam Sync",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { project: ProjectRow };
        window.location.href = `/admin/sync-editor/${data.project.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string, projectTitle: string) => {
    if (
      !confirm(
        `Delete "${projectTitle}"? Sync offsets are lost; media stays in the library.`,
      )
    )
      return;
    await fetch(`/api/admin/sync-projects/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="ca-eyebrow">After Media · before Timeline</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          Multicam Sync
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ca-muted">
          DaVinci Resolve–style workflow: pick a{" "}
          <strong className="text-zinc-300">master audio</strong> (board mix),
          add camera angles (or any video sources), auto-sync by{" "}
          <strong className="text-zinc-300">waveform</strong> or align by hand,
          then send a multicam stack to Timeline.
        </p>
      </header>

      {/* Resolve pipeline steps */}
      <ol className="grid gap-3 sm:grid-cols-4">
        {[
          { n: "1", t: "Media", d: "Import cams + board", href: "/admin/media" },
          { n: "2", t: "Sync", d: "Waveform / manual offset", href: null },
          { n: "3", t: "Multicam", d: "Program + angles", href: null },
          { n: "4", t: "Timeline", d: "Cut & mix", href: "/admin/edits" },
        ].map((s) => (
          <li
            key={s.n}
            className={`rounded-xl border px-4 py-3 ${
              s.href === null
                ? "border-ca-gold/40 bg-ca-gold/10"
                : "border-white/10 bg-ca-panel/50"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-ca-gold">
              {s.n}
            </p>
            {s.href ? (
              <Link
                href={s.href}
                className="mt-1 block font-medium text-white hover:text-ca-gold"
              >
                {s.t}
              </Link>
            ) : (
              <p className="mt-1 font-medium text-white">{s.t}</p>
            )}
            <p className="mt-0.5 text-xs text-ca-muted">{s.d}</p>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-4 text-sm text-ca-muted">
        <span>
          Media pool:{" "}
          <strong className="text-white">{mediaCount.video}</strong> video ·{" "}
          <strong className="text-white">{mediaCount.audio}</strong> audio
        </span>
        {mediaCount.video + mediaCount.audio === 0 && (
          <Link href="/admin/media" className="text-ca-gold hover:underline">
            Import media first →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void create();
          }}
          placeholder="Multicam name — e.g. Goldfield live · board + 2 cams"
          className="w-full max-w-md rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-ca-gold sm:w-96"
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={creating}
          className="ca-btn ca-btn-primary disabled:opacity-40"
        >
          {creating ? "Creating…" : "New multicam sync"}
        </button>
      </div>

      {projects === null ? (
        <p className="text-ca-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-ca-muted">
          No multicam projects yet — create one above (after Media import).
        </p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-ca-border bg-ca-panel px-4 py-3"
            >
              <div>
                <Link
                  href={`/admin/sync-editor/${p.id}`}
                  className="font-semibold text-white hover:text-ca-gold"
                >
                  {p.title}
                </Link>
                <p className="text-xs text-ca-muted">
                  {p.angleCount} angle{p.angleCount === 1 ? "" : "s"}
                  {p.masterTitle ? ` · master: ${p.masterTitle}` : " · no master yet"}
                  {" · "}
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(p.id, p.title)}
                className="text-xs text-zinc-500 hover:text-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
