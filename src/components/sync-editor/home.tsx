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

export function SyncEditorHome() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sync-projects");
    if (res.ok) {
      const data = (await res.json()) as { projects: ProjectRow[] };
      setProjects(data.projects);
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
        body: JSON.stringify({ title }),
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
    if (!confirm(`Delete "${projectTitle}"? Offsets are lost; files stay in the media library.`))
      return;
    await fetch(`/api/admin/sync-projects/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Multi-angle sync</h1>
        <p className="mt-2 max-w-xl text-sm text-ca-muted">
          One master audio track, many camera angles — line them up, save the offsets. Upload
          footage in the Media Library first; projects reference it from there.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) void create();
          }}
          placeholder="New session title — e.g. The Verge @ Goldfield 7/26"
          className="w-80 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-ca-gold"
        />
        <button
          onClick={create}
          disabled={creating || !title.trim()}
          className="rounded-full bg-ca-gold px-5 py-2 text-sm font-semibold text-ca-ink disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create project"}
        </button>
      </div>

      {projects === null ? (
        <p className="text-ca-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-ca-muted">No sync projects yet — create the first one above.</p>
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
                  {p.masterTitle ? `master: ${p.masterTitle}` : "no master audio yet"} ·{" "}
                  {p.angleCount} angle{p.angleCount === 1 ? "" : "s"} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => remove(p.id, p.title)}
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
