"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCapability } from "@/components/capability-provider";

interface ProjectRow {
  id: string;
  title: string;
  clipCount: number;
  durationMs: number;
  createdAt: string;
  updatedAt: string;
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function EditsHome() {
  const { mode, videoOn } = useCapability();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/edit-projects");
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
      const res = await fetch("/api/admin/edit-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mode }),
      });
      if (res.ok) {
        const data = (await res.json()) as { project: ProjectRow };
        window.location.href = `/admin/edits/${data.project.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string, projectTitle: string) => {
    if (!confirm(`Delete "${projectTitle}"? The timeline is lost; files stay in the media library.`))
      return;
    await fetch(`/api/admin/edit-projects/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">
          Timeline
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ca-muted">
          {videoOn
            ? "Import Cam A, Cam B, and board audio into a timeline, line them up, then cut. Clips reference the Media Library — originals are never touched."
            : "Import multi-track audio, line stems up, then cut. New projects start with audio lanes only (studio is in audio-only mode)."}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) void create();
          }}
          placeholder="New timeline — e.g. The Verge @ Goldfield — highlight reel"
          className="w-80 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-ca-gold"
        />
        <button
          onClick={create}
          disabled={creating || !title.trim()}
          className="ca-btn ca-btn-primary disabled:opacity-40"
        >
          {creating ? "Creating…" : "New timeline"}
        </button>
      </div>

      {projects === null ? (
        <p className="text-ca-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-ca-muted">
          No timelines yet — create the first one above.
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
                  href={`/admin/edits/${p.id}`}
                  className="font-semibold text-white hover:text-ca-gold"
                >
                  {p.title}
                </Link>
                <p className="text-xs text-ca-muted">
                  {p.clipCount} clip{p.clipCount === 1 ? "" : "s"} · {fmtDuration(p.durationMs)} ·
                  updated {new Date(p.updatedAt).toLocaleDateString()}
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
