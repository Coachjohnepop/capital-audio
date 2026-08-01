"use client";

/**
 * DaVinci Resolve–style Multicam Sync workbench.
 *
 * Media Pool (library) → select master audio + video angles →
 * Auto Sync (waveform) / First Frame / Manual nudge →
 * Multicam viewer → Send to Timeline (GarageBand stack with offsets).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MediaItem } from "@/lib/media-shared";
import { mediaPlayUrl } from "@/lib/media-shared";
import { syncByWaveform } from "@/lib/waveform-sync";

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

type SyncMethod = "waveform" | "first-frame" | "manual";

const NUDGES = [-1000, -100, -10, 10, 100, 1000];

export function SyncWorkbench({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [programId, setProgramId] = useState<string | null>(null);
  const [auditionId, setAuditionId] = useState<string | null>(null);
  const [syncMethod, setSyncMethod] = useState<SyncMethod>("waveform");
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [poolSelected, setPoolSelected] = useState<Set<string>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const playUrl = useCallback(
    (mediaId: string) => {
      const m = library.find((x) => x.id === mediaId);
      return m ? mediaPlayUrl(m) : `/api/admin/media/${mediaId}/file`;
    },
    [library],
  );

  const load = useCallback(async () => {
    const [projRes, mediaRes] = await Promise.all([
      fetch(`/api/admin/sync-projects/${projectId}`),
      fetch("/api/admin/media"),
    ]);
    if (!projRes.ok) {
      setLoadError(
        projRes.status === 404 ? "Project not found" : "Could not load project",
      );
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

  // Slave videos to master audio clock
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (!audio || !project) return;
      for (const angle of project.angles) {
        const video = videoRefs.current.get(angle.id);
        if (!video) continue;
        const target = audio.currentTime - angle.offsetMs / 1000;
        if (target < 0 || target > (video.duration || Infinity)) {
          if (!video.paused) video.pause();
          video.currentTime = Math.max(0, Math.min(target, video.duration || 0));
          continue;
        }
        if (audio.paused) {
          if (!video.paused) video.pause();
          if (Math.abs(video.currentTime - target) > 0.03)
            video.currentTime = target;
          continue;
        }
        if (video.paused) {
          video.currentTime = target;
          void video.play().catch(() => {});
        }
        const drift = video.currentTime - target;
        if (Math.abs(drift) > 0.12) {
          video.currentTime = target;
          video.playbackRate = 1;
        } else if (Math.abs(drift) > 0.03) {
          video.playbackRate = drift > 0 ? 0.95 : 1.05;
        } else {
          video.playbackRate = 1;
        }
      }
    };
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [project]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = auditionId != null;
    for (const [id, v] of videoRefs.current) v.muted = id !== auditionId;
  }, [auditionId, project]);

  const mediaById = new Map(library.map((m) => [m.id, m]));
  const mediaTitle = (id: string) =>
    mediaById.get(id)?.title ?? "(missing from library)";

  const setOffset = (angleId: string, offsetMs: number) => {
    setProject((p) =>
      p
        ? {
            ...p,
            angles: p.angles.map((a) =>
              a.id === angleId ? { ...a, offsetMs } : a,
            ),
          }
        : p,
    );
    setDirty(true);
  };

  const setLabel = (angleId: string, label: string) => {
    setProject((p) =>
      p
        ? {
            ...p,
            angles: p.angles.map((a) =>
              a.id === angleId ? { ...a, label } : a,
            ),
          }
        : p,
    );
    setDirty(true);
  };

  const removeAngle = (angleId: string) => {
    videoRefs.current.delete(angleId);
    setProject((p) =>
      p ? { ...p, angles: p.angles.filter((a) => a.id !== angleId) } : p,
    );
    setDirty(true);
  };

  const setMaster = (mediaId: string) => {
    setProject((p) => (p ? { ...p, masterMediaId: mediaId || null } : p));
    setDirty(true);
  };

  const addAnglesFromPool = () => {
    if (!project || poolSelected.size === 0) return;
    const next = [...project.angles];
    for (const mediaId of poolSelected) {
      if (next.some((a) => a.mediaId === mediaId)) continue;
      const m = mediaById.get(mediaId);
      if (!m || m.kind !== "video") continue;
      next.push({
        id: crypto.randomUUID(),
        mediaId,
        label: m.title,
        offsetMs: 0,
        position: next.length,
      });
    }
    setProject({ ...project, angles: next });
    setProgramId((p) => p ?? next[0]?.id ?? null);
    setPoolSelected(new Set());
    setDirty(true);
  };

  const togglePool = (id: string) => {
    setPoolSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

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

  /** Resolve-style Auto Sync */
  const runAutoSync = async () => {
    if (!project?.masterMediaId || project.angles.length === 0) {
      setSyncLog("Pick a master audio and at least one video angle first.");
      return;
    }
    setSyncing(true);
    setSyncLog(null);
    try {
      if (syncMethod === "first-frame") {
        setProject((p) =>
          p
            ? {
                ...p,
                angles: p.angles.map((a) => ({ ...a, offsetMs: 0 })),
              }
            : p,
        );
        setDirty(true);
        setSyncLog("Aligned all angles to first frame (offset 0).");
        return;
      }
      if (syncMethod === "manual") {
        setSyncLog("Manual mode — use Audition + nudge until hits line up.");
        return;
      }

      // Waveform
      const masterUrl = playUrl(project.masterMediaId);
      const results: string[] = [];
      const updates = new Map<string, number>();

      for (const angle of project.angles) {
        setSyncLog(`Analyzing waveform: ${angle.label}…`);
        try {
          const angleUrl = playUrl(angle.mediaId);
          const r = await syncByWaveform(masterUrl, angleUrl);
          updates.set(angle.id, r.offsetMs);
          results.push(
            `${angle.label}: ${r.offsetMs >= 0 ? "+" : ""}${r.offsetMs} ms (confidence ${Math.round(r.confidence * 100)}%)`,
          );
        } catch (err) {
          results.push(
            `${angle.label}: failed — ${err instanceof Error ? err.message : "error"}`,
          );
        }
      }

      setProject((p) =>
        p
          ? {
              ...p,
              angles: p.angles.map((a) =>
                updates.has(a.id)
                  ? { ...a, offsetMs: updates.get(a.id)! }
                  : a,
              ),
            }
          : p,
      );
      setDirty(true);
      setSyncLog(`Waveform sync complete.\n${results.join("\n")}`);
    } finally {
      setSyncing(false);
    }
  };

  /** Send multicam stack to Timeline with offsets as startMs */
  const sendToTimeline = async () => {
    if (!project) return;
    setSending(true);
    try {
      await save();
      const createRes = await fetch("/api/admin/edit-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${project.title} · Timeline`,
          mode: "audio-video",
        }),
      });
      if (!createRes.ok) throw new Error("Could not create timeline");
      const { project: edit } = (await createRes.json()) as {
        project: { id: string };
      };

      // Build GarageBand tracks: each angle + master audio, offset applied
      const tracks: unknown[] = [];
      let order = 0;

      for (const angle of project.angles) {
        const m = mediaById.get(angle.mediaId);
        // Default length if unknown — browser will re-trim when opened
        const durMs = m?.duration
          ? Math.round(m.duration * 1000)
          : 600_000;
        tracks.push({
          id: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
          kind: "video",
          name: angle.label,
          orderIdx: order++,
          muted: false,
          locked: false,
          volume: 1,
          clips: [
            {
              id: crypto.randomUUID(),
              mediaId: angle.mediaId,
              startMs: Math.max(0, angle.offsetMs),
              srcInMs: 0,
              srcOutMs: durMs,
              speed: 1,
              muted: true,
              gainDb: 0,
              opacity: 1,
              fadeInMs: 0,
              fadeOutMs: 0,
              label: angle.label,
              effects: [],
            },
          ],
        });
      }

      if (project.masterMediaId) {
        const m = mediaById.get(project.masterMediaId);
        const durMs = m?.duration
          ? Math.round(m.duration * 1000)
          : 600_000;
        tracks.push({
          id: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
          kind: m?.kind === "video" ? "audio" : "audio",
          name: `Master — ${mediaTitle(project.masterMediaId)}`,
          orderIdx: order++,
          muted: false,
          locked: false,
          volume: 1,
          clips: [
            {
              id: crypto.randomUUID(),
              mediaId: project.masterMediaId,
              startMs: 0,
              srcInMs: 0,
              srcOutMs: durMs,
              speed: 1,
              muted: false,
              gainDb: 0,
              opacity: 1,
              fadeInMs: 0,
              fadeOutMs: 0,
              label: mediaTitle(project.masterMediaId),
              effects: [],
            },
          ],
        });
      }

      const patchRes = await fetch(`/api/admin/edit-projects/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${project.title} · Timeline`,
          tracks,
          markers: [],
        }),
      });
      if (!patchRes.ok) throw new Error("Could not fill timeline");
      window.location.href = `/admin/edits/${edit.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Send to Timeline failed");
    } finally {
      setSending(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-red-300">{loadError}</p>
        <Link href="/admin/sync-editor" className="text-ca-gold underline">
          Back to Multicam Sync
        </Link>
      </div>
    );
  }
  if (!project) return <p className="text-ca-muted">Loading…</p>;

  const masterOptions = [...library].sort((a, b) =>
    a.kind === b.kind
      ? a.title.localeCompare(b.title)
      : a.kind === "audio"
        ? -1
        : 1,
  );
  const videoPool = library.filter((m) => m.kind === "video");
  const master = project.masterMediaId
    ? (mediaById.get(project.masterMediaId) ?? null)
    : null;
  const program =
    project.angles.find((a) => a.id === programId) ??
    project.angles[0] ??
    null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/sync-editor"
            className="text-xs uppercase tracking-[0.2em] text-ca-gold"
          >
            ← Multicam Sync
          </Link>
          <input
            value={project.title}
            onChange={(e) => {
              setProject({ ...project, title: e.target.value });
              setDirty(true);
            }}
            className="mt-1 block w-full min-w-[280px] bg-transparent font-display text-2xl font-semibold text-white outline-none"
          />
          <p className="mt-1 text-xs text-ca-muted">
            Resolve-style: Media Pool → Auto Sync → Multicam view → Timeline
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving}
            className="ca-btn ca-btn-secondary ca-btn-sm disabled:opacity-40"
          >
            {saving ? "Saving…" : dirty ? "Save sync" : "Saved"}
          </button>
          <button
            type="button"
            onClick={() => void sendToTimeline()}
            disabled={sending || project.angles.length === 0}
            className="ca-btn ca-btn-primary ca-btn-sm disabled:opacity-40"
          >
            {sending ? "Sending…" : "Create Timeline from multicam"}
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* —— Media Pool (Resolve) —— */}
        <aside className="xl:col-span-3 space-y-3">
          <div className="rounded-xl border border-ca-border bg-ca-panel p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ca-gold">
              Media Pool
            </h2>
            <p className="mt-1 text-[11px] text-ca-muted">
              From library — select video angles, then Add to multicam.
            </p>
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto ca-scroll">
              {videoPool.length === 0 ? (
                <li className="text-xs text-ca-muted">
                  No video in library.{" "}
                  <Link href="/admin/media" className="text-ca-gold underline">
                    Import media
                  </Link>
                </li>
              ) : (
                videoPool.map((m) => {
                  const inMulticam = project.angles.some(
                    (a) => a.mediaId === m.id,
                  );
                  return (
                    <li key={m.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                          poolSelected.has(m.id)
                            ? "bg-ca-gold/15 text-ca-gold"
                            : "text-zinc-300 hover:bg-white/5"
                        } ${inMulticam ? "opacity-50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={poolSelected.has(m.id)}
                          disabled={inMulticam}
                          onChange={() => togglePool(m.id)}
                          className="accent-[#d4a853]"
                        />
                        <span className="truncate">{m.title}</span>
                        {inMulticam && (
                          <span className="ml-auto text-[10px] text-zinc-500">
                            in bin
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
            <button
              type="button"
              onClick={addAnglesFromPool}
              disabled={poolSelected.size === 0}
              className="ca-btn ca-btn-secondary ca-btn-sm mt-3 w-full disabled:opacity-40"
            >
              Add selected to multicam
            </button>
          </div>

          {/* Master audio */}
          <div className="rounded-xl border border-ca-border bg-ca-panel p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ca-gold">
              Master audio
            </h2>
            <p className="mt-1 text-[11px] text-ca-muted">
              Board mix / clock — like Resolve “audio track for sync”
            </p>
            <select
              value={project.masterMediaId ?? ""}
              onChange={(e) => setMaster(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-ca-ink px-3 py-2 text-sm text-white outline-none focus:border-ca-gold"
            >
              <option value="">— pick master —</option>
              {masterOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.kind === "audio" ? "♪" : "▸"} {m.title}
                </option>
              ))}
            </select>
            {master && (
              <audio
                key={master.id}
                ref={audioRef}
                src={playUrl(master.id)}
                controls
                className="mt-2 w-full"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            )}
          </div>
        </aside>

        {/* —— Viewer + sync —— */}
        <div className="xl:col-span-9 space-y-4">
          {/* Auto Sync bar (Resolve) */}
          <section className="rounded-xl border border-ca-gold/30 bg-ca-gold/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold text-white">Auto Sync</h2>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["waveform", "Waveform"],
                    ["first-frame", "First frame"],
                    ["manual", "Manual"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSyncMethod(id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      syncMethod === id
                        ? "bg-ca-gold text-ca-ink"
                        : "border border-white/15 text-ca-muted hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void runAutoSync()}
                disabled={
                  syncing ||
                  !project.masterMediaId ||
                  project.angles.length === 0
                }
                className="ca-btn ca-btn-primary ca-btn-sm disabled:opacity-40"
              >
                {syncing ? "Syncing…" : "Sync multicam"}
              </button>
              <button
                type="button"
                onClick={playing ? pauseAll : () => void playAll()}
                disabled={!project.masterMediaId}
                className="ca-btn ca-btn-secondary ca-btn-sm disabled:opacity-40"
              >
                {playing ? "Pause all" : "Play all in sync"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ca-muted">
              {syncMethod === "waveform" &&
                "Cross-correlates energy of board mix vs each angle’s audio (first ~90s) — same idea as Resolve waveform sync."}
              {syncMethod === "first-frame" &&
                "Sets every offset to 0 (cameras started together)."}
              {syncMethod === "manual" &&
                "Use Audition on an angle + nudge ms until hits line up."}
            </p>
            {syncLog && (
              <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-ca-ink/60 p-3 text-xs text-zinc-300">
                {syncLog}
              </pre>
            )}
          </section>

          {/* Program viewer */}
          {program ? (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-white">
                  Program — {program.label}
                </h2>
                <span className="text-xs text-ca-muted">
                  offset {program.offsetMs >= 0 ? "+" : ""}
                  {program.offsetMs} ms
                </span>
              </div>
              <video
                key={`program-${program.id}`}
                ref={(el) => {
                  if (el) videoRefs.current.set(program.id, el);
                }}
                src={playUrl(program.mediaId)}
                muted={auditionId !== program.id}
                playsInline
                controls
                className="aspect-video w-full rounded-xl border border-ca-border bg-black object-contain"
              />
            </section>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-ca-muted">
              Add video angles from the Media Pool
            </div>
          )}

          {/* Angle grid */}
          <section>
            <h2 className="mb-2 font-semibold text-white">
              Angles ({project.angles.length})
            </h2>
            {project.angles.length === 0 ? (
              <p className="text-sm text-ca-muted">
                Select cameras in Media Pool → Add selected to multicam.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {project.angles.map((angle) => (
                  <div
                    key={angle.id}
                    className={`rounded-xl border p-2 ${
                      angle.id === program?.id
                        ? "border-ca-gold/60 bg-ca-gold/5"
                        : "border-ca-border bg-ca-panel"
                    }`}
                  >
                    <video
                      key={`thumb-${angle.id}`}
                      ref={(el) => {
                        if (el) videoRefs.current.set(angle.id, el);
                      }}
                      src={playUrl(angle.mediaId)}
                      muted
                      playsInline
                      className="mb-2 aspect-video w-full rounded-lg bg-black object-cover"
                      onClick={() => setProgramId(angle.id)}
                    />
                    <input
                      value={angle.label}
                      onChange={(e) => setLabel(angle.id, e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none"
                    />
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setProgramId(angle.id)}
                        className="text-ca-gold hover:underline"
                      >
                        Program
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAuditionId(
                            auditionId === angle.id ? null : angle.id,
                          )
                        }
                        className={
                          auditionId === angle.id
                            ? "text-amber-300"
                            : "text-zinc-400 hover:text-white"
                        }
                      >
                        {auditionId === angle.id ? "Auditioning" : "Audition"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAngle(angle.id)}
                        className="text-zinc-500 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {NUDGES.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setOffset(angle.id, angle.offsetMs + n)
                          }
                          className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-ca-gold"
                        >
                          {Math.abs(n) >= 1000
                            ? `${n > 0 ? "+" : ""}${n / 1000}s`
                            : `${n > 0 ? "+" : ""}${n}`}
                        </button>
                      ))}
                      <input
                        type="number"
                        value={angle.offsetMs}
                        onChange={(e) =>
                          setOffset(
                            angle.id,
                            Math.round(Number(e.target.value) || 0),
                          )
                        }
                        className="w-20 rounded border border-white/15 bg-transparent px-1 py-0.5 text-right text-[11px] text-white"
                      />
                      <span className="text-[10px] text-zinc-500">ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-white">Notes</h2>
            <textarea
              value={project.notes}
              onChange={(e) => {
                setProject({ ...project, notes: e.target.value });
                setDirty(true);
              }}
              rows={2}
              placeholder="Clap at 0:12, downbeat song 2, export notes…"
              className="w-full rounded-lg border border-ca-border bg-ca-panel p-3 text-sm text-zinc-200 outline-none focus:border-ca-gold"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
