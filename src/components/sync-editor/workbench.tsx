"use client";

/**
 * Multi-angle sync workbench.
 *
 * Model: the MASTER AUDIO is the clock. Every video angle carries an
 * offsetMs — where the angle's t=0 sits relative to the master's t=0
 * (positive = the camera started rolling AFTER the audio). Playback keeps
 * each <video> slaved to the audio element: hard-seek on big drift, gentle
 * playbackRate nudges on small drift. Nudge the offsets until lips, hits,
 * and cymbals line up; Save persists the offsets.
 *
 * Footage comes from the shared media library — upload files there first,
 * then reference them here. Files are never modified.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MediaItem } from "@/lib/media-shared";

interface Angle {
  id: string;
  mediaId: string;
  label: string;
  offsetMs: number;
  position: number;
}
interface Project {
  id: string;
  title: string;
  notes: string;
  masterMediaId: string | null;
  angles: Angle[];
  createdAt: string;
  updatedAt: string;
}

const NUDGES = [-1000, -100, -10, 10, 100, 1000];

const fileUrl = (mediaId: string) => `/api/admin/media/${mediaId}/file`;

export function SyncWorkbench({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [programId, setProgramId] = useState<string | null>(null);
  const [auditionId, setAuditionId] = useState<string | null>(null);
  const [anglePick, setAnglePick] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const load = useCallback(async () => {
    const [projRes, mediaRes] = await Promise.all([
      fetch(`/api/admin/sync-projects/${projectId}`),
      fetch("/api/admin/media"),
    ]);
    if (!projRes.ok) {
      setLoadError(projRes.status === 404 ? "Project not found" : "Could not load project");
      return;
    }
    const data = (await projRes.json()) as { project: Project };
    setProject(data.project);
    setProgramId((p) => p ?? data.project.angles[0]?.id ?? null);
    if (mediaRes.ok) setLibrary((await mediaRes.json()) as MediaItem[]);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ---- The clock loop: keep every angle slaved to the master audio ----
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (!audio || !project) return;
      for (const angle of project.angles) {
        const video = videoRefs.current.get(angle.id);
        if (!video) continue;
        const target = audio.currentTime - angle.offsetMs / 1000;
        if (target < 0 || target > (video.duration || Infinity)) {
          // The clock is outside this angle's footage — hold at its edge.
          if (!video.paused) video.pause();
          video.currentTime = Math.max(0, Math.min(target, video.duration || 0));
          continue;
        }
        if (audio.paused) {
          if (!video.paused) video.pause();
          if (Math.abs(video.currentTime - target) > 0.03) video.currentTime = target;
          continue;
        }
        if (video.paused) {
          video.currentTime = target;
          void video.play().catch(() => {});
        }
        const drift = video.currentTime - target;
        if (Math.abs(drift) > 0.12) {
          video.currentTime = target; // hard resync
          video.playbackRate = 1;
        } else if (Math.abs(drift) > 0.03) {
          video.playbackRate = drift > 0 ? 0.95 : 1.05; // gentle chase
        } else {
          video.playbackRate = 1;
        }
      }
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [project]);

  const playAll = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    await audio.play().catch(() => {});
    setPlaying(true);
  };
  const pauseAll = () => {
    audioRef.current?.pause();
    for (const v of videoRefs.current.values()) v.pause();
    setPlaying(false);
  };

  // Audition: hear ONE angle's own audio (master muted) to sync by ear.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = auditionId != null;
    for (const [id, v] of videoRefs.current) v.muted = id !== auditionId;
  }, [auditionId, project]);

  const mediaById = new Map(library.map((m) => [m.id, m]));
  const mediaTitle = (id: string) => mediaById.get(id)?.title ?? "(missing from library)";

  const setOffset = (angleId: string, offsetMs: number) => {
    setProject((p) =>
      p
        ? { ...p, angles: p.angles.map((a) => (a.id === angleId ? { ...a, offsetMs } : a)) }
        : p
    );
    setDirty(true);
  };
  const setLabel = (angleId: string, label: string) => {
    setProject((p) =>
      p ? { ...p, angles: p.angles.map((a) => (a.id === angleId ? { ...a, label } : a)) } : p
    );
    setDirty(true);
  };
  const removeAngle = (angleId: string) => {
    if (!confirm("Remove this angle from the project? (The file stays in the media library.)"))
      return;
    videoRefs.current.delete(angleId);
    setProject((p) => (p ? { ...p, angles: p.angles.filter((a) => a.id !== angleId) } : p));
    setDirty(true);
  };
  const setMaster = (mediaId: string) => {
    setProject((p) => (p ? { ...p, masterMediaId: mediaId || null } : p));
    setDirty(true);
  };
  const addAngle = () => {
    if (!anglePick || !project) return;
    const angle: Angle = {
      id: crypto.randomUUID(),
      mediaId: anglePick,
      label: mediaTitle(anglePick),
      offsetMs: 0,
      position: project.angles.length,
    };
    setProject({ ...project, angles: [...project.angles, angle] });
    setProgramId((p) => p ?? angle.id);
    setAnglePick("");
    setDirty(true);
  };

  const save = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sync-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          notes: project.notes,
          masterMediaId: project.masterMediaId,
          angles: project.angles,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDirty(false);
    } catch {
      alert("Could not save — try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-red-300">{loadError}</p>
        <Link href="/admin/sync-editor" className="text-ca-gold underline">
          Back to sync projects
        </Link>
      </div>
    );
  }
  if (!project) return <p className="text-ca-muted">Loading…</p>;

  // Master can be an audio file or the audio track of a video file.
  const masterOptions = [...library].sort((a, b) =>
    a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === "audio" ? -1 : 1
  );
  const videoOptions = library.filter((m) => m.kind === "video");
  const master = project.masterMediaId ? (mediaById.get(project.masterMediaId) ?? null) : null;
  const program = project.angles.find((a) => a.id === programId) ?? project.angles[0] ?? null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/sync-editor"
            className="text-xs uppercase tracking-[0.2em] text-ca-gold"
          >
            ← Sync projects
          </Link>
          <input
            value={project.title}
            onChange={(e) => {
              setProject({ ...project, title: e.target.value });
              setDirty(true);
            }}
            className="mt-1 block w-full bg-transparent font-display text-2xl font-semibold text-white outline-none"
          />
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-full bg-ca-gold px-5 py-2 text-sm font-semibold text-ca-ink disabled:opacity-40"
        >
          {saving ? "Saving…" : dirty ? "Save offsets" : "Saved"}
        </button>
      </header>

      {/* Master audio — the clock */}
      <section className="rounded-xl border border-ca-border bg-ca-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Master audio</h2>
          <select
            value={project.masterMediaId ?? ""}
            onChange={(e) => setMaster(e.target.value)}
            className="rounded-lg border border-white/15 bg-ca-ink px-3 py-1.5 text-sm text-white outline-none focus:border-ca-gold"
          >
            <option value="">— pick from media library —</option>
            {masterOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kind === "audio" ? "♪" : "▸"} {m.title}
              </option>
            ))}
          </select>
        </div>
        {master ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-ca-muted">{master.filename}</p>
            <audio
              key={master.id}
              ref={audioRef}
              src={fileUrl(master.id)}
              controls
              className="w-full"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={playing ? pauseAll : playAll}
                className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
              >
                {playing ? "Pause all" : "Play all in sync"}
              </button>
              {auditionId && (
                <button
                  onClick={() => setAuditionId(null)}
                  className="rounded-full bg-amber-500/20 px-4 py-1.5 text-sm text-amber-200"
                >
                  Auditioning an angle — back to master audio
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ca-muted">
            Pick the board mix / master recording — it becomes the clock every angle syncs to.
            Upload it in the Media Library first if it isn&apos;t listed.
          </p>
        )}
      </section>

      {/* Program view */}
      {program && (
        <section className="space-y-2">
          <h2 className="font-semibold text-white">Program — {program.label}</h2>
          <video
            key={`program-${program.id}`}
            ref={(el) => {
              if (el) videoRefs.current.set(program.id, el);
            }}
            src={fileUrl(program.mediaId)}
            muted
            playsInline
            className="w-full rounded-xl border border-ca-border bg-black"
          />
        </section>
      )}

      {/* Angle strip */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-white">Angles ({project.angles.length})</h2>
          <div className="flex items-center gap-2">
            <select
              value={anglePick}
              onChange={(e) => setAnglePick(e.target.value)}
              className="rounded-lg border border-white/15 bg-ca-ink px-3 py-1.5 text-sm text-white outline-none focus:border-ca-gold"
            >
              <option value="">— pick camera footage —</option>
              {videoOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <button
              onClick={addAngle}
              disabled={!anglePick}
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-zinc-200 hover:border-ca-gold disabled:opacity-40"
            >
              + Add angle
            </button>
          </div>
        </div>

        {project.angles.length === 0 && (
          <p className="text-sm text-ca-muted">
            Add each camera&apos;s footage — every angle gets its own sync offset.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {project.angles.map((angle) => (
            <div
              key={angle.id}
              className={`rounded-xl border p-3 ${angle.id === program?.id ? "border-ca-gold/60 bg-ca-gold/5" : "border-ca-border bg-ca-panel"}`}
            >
              {angle.id !== program?.id && (
                <video
                  key={`thumb-${angle.id}`}
                  ref={(el) => {
                    if (el) videoRefs.current.set(angle.id, el);
                  }}
                  src={fileUrl(angle.mediaId)}
                  muted
                  playsInline
                  className="mb-2 w-full rounded-lg bg-black"
                  onClick={() => setProgramId(angle.id)}
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <input
                  value={angle.label}
                  onChange={(e) => setLabel(angle.id, e.target.value)}
                  className="w-32 bg-transparent text-sm font-semibold text-white outline-none"
                />
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setProgramId(angle.id)}
                    className="text-zinc-300 hover:text-ca-gold"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setAuditionId(auditionId === angle.id ? null : angle.id)}
                    className={
                      auditionId === angle.id ? "text-amber-300" : "text-zinc-300 hover:text-ca-gold"
                    }
                    title="Hear this angle's own audio to line it up by ear"
                  >
                    {auditionId === angle.id ? "Hearing this" : "Audition"}
                  </button>
                  <button
                    onClick={() => removeAngle(angle.id)}
                    className="text-zinc-500 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                {mediaTitle(angle.mediaId)}
              </p>

              {/* Offset controls */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {NUDGES.map((n) => (
                  <button
                    key={n}
                    onClick={() => setOffset(angle.id, angle.offsetMs + n)}
                    className="rounded border border-white/15 px-1.5 py-0.5 text-[11px] text-zinc-300 hover:border-ca-gold"
                  >
                    {Math.abs(n) >= 1000 ? `${n > 0 ? "+" : ""}${n / 1000}s` : `${n > 0 ? "+" : ""}${n}ms`}
                  </button>
                ))}
                <input
                  type="number"
                  value={angle.offsetMs}
                  onChange={(e) => setOffset(angle.id, Math.round(Number(e.target.value) || 0))}
                  className="w-24 rounded border border-white/15 bg-transparent px-2 py-0.5 text-right text-xs text-white"
                />
                <span className="text-[11px] text-zinc-500">ms vs master</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-semibold text-white">Notes</h2>
        <textarea
          value={project.notes}
          onChange={(e) => {
            setProject({ ...project, notes: e.target.value });
            setDirty(true);
          }}
          rows={3}
          placeholder="Set list, sync landmarks (clap at 0:12, downbeat of song 2…), export decisions"
          className="w-full rounded-lg border border-ca-border bg-ca-panel p-3 text-sm text-zinc-200 outline-none focus:border-ca-gold"
        />
      </section>
    </div>
  );
}
