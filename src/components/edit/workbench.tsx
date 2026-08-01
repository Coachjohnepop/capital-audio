"use client";

/**
 * Studio timeline — GarageBand multi-track model, not iMovie splice.
 *
 * Each camera / audio feed is its own parallel track (like instruments).
 * Feeds run simultaneously; you line them up with offsets, mute camera mics,
 * keep board mix hot, and choose which video feed is "program" (on screen).
 * Clips are references into Media Library files — originals never change.
 *
 * Playback: one master clock; every feed track slaves independently.
 * Program video is whichever feed is soloed/selected for picture.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImportMediaPair } from "@/components/admin/import-media-button";
import type { MediaItem } from "@/lib/media-shared";

interface Effect {
  id: string;
  kind: string;
  params: string;
  orderIdx: number;
}
interface Clip {
  id: string;
  mediaId: string;
  startMs: number;
  srcInMs: number;
  srcOutMs: number;
  speed: number;
  muted: boolean;
  gainDb: number;
  opacity: number;
  fadeInMs: number;
  fadeOutMs: number;
  label: string;
  effects: Effect[];
}
interface Track {
  id: string;
  kind: "video" | "audio";
  name: string;
  orderIdx: number;
  muted: boolean;
  locked: boolean;
  volume: number;
  clips: Clip[];
}
interface Marker {
  id: string;
  clipId: string | null;
  tMs: number;
  label: string;
  note: string | null;
  color: string | null;
  createdAt: string;
}
interface Project {
  id: string;
  title: string;
  notes: string;
  tracks: Track[];
  markers: Marker[];
  createdAt: string;
  updatedAt: string;
}

type Doc = Pick<Project, "tracks" | "markers">;

const fileUrl = (mediaId: string) => `/api/admin/media/${mediaId}/file`;
const durMs = (c: Pick<Clip, "srcInMs" | "srcOutMs" | "speed">) =>
  Math.max(0, Math.round((c.srcOutMs - c.srcInMs) / (c.speed || 1)));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const MIN_CLIP_MS = 50;

/**
 * GarageBand-style: tracks are free-floating parallel feeds.
 * No magnetic storyline — we do not auto-collapse gaps like iMovie.
 * (ripple kept as a no-op so call sites stay stable.)
 */
function ripple(_track: Track, _trackIndex: number) {
  /* intentional no-op */
}

function feedLabel(kind: "video" | "audio", existing: Track[], title: string) {
  const n =
    existing.filter((t) => t.kind === kind).length + 1;
  const base = title.trim() || (kind === "video" ? `Cam ${n}` : `Mix ${n}`);
  // Prefer the file name; fall back to Cam N / Mix N
  return base.slice(0, 40);
}

function timelineEndMs(tracks: Track[]) {
  let end = 0;
  for (const t of tracks)
    for (const c of t.clips) end = Math.max(end, c.startMs + durMs(c));
  return end;
}

function fmtTime(ms: number) {
  const t = Math.max(0, ms) / 1000;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const tenth = Math.floor((t * 10) % 10);
  return `${m}:${String(s).padStart(2, "0")}.${tenth}`;
}

export function EditWorkbench({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [curMs, setCurMs] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pxPerSec, setPxPerSec] = useState(40);
  const [addPick, setAddPick] = useState("");
  /** Which video feed is on the monitor (GarageBand "this instrument in focus"). */
  const [programTrackId, setProgramTrackId] = useState<string | null>(null);
  /** Solo: when set, only that track is heard (others muted for mix). */
  const [soloTrackId, setSoloTrackId] = useState<string | null>(null);

  const els = useRef<Map<string, HTMLVideoElement | HTMLAudioElement>>(new Map());
  const projectRef = useRef<Project | null>(null);
  const curRef = useRef(0);
  const playingRef = useRef(false);
  const clockBase = useRef({ ms: 0, perf: 0 });
  const undoStack = useRef<Doc[]>([]);
  const redoStack = useRef<Doc[]>([]);
  const durCache = useRef<Map<string, number>>(new Map());
  const laneRef = useRef<HTMLDivElement | null>(null);
  const timelineBox = useRef<HTMLDivElement | null>(null);
  const didFit = useRef(false);

  // Mirror hot state into refs after every render, so engine/interval/handler
  // closures always read fresh values. Declared before any effect that uses
  // them, so within a commit this runs first.
  useEffect(() => {
    projectRef.current = project;
    curRef.current = curMs;
    playingRef.current = playing;
  });

  // ---------- load ----------
  const load = useCallback(async () => {
    const [projRes, mediaRes] = await Promise.all([
      fetch(`/api/admin/edit-projects/${projectId}`),
      fetch("/api/admin/media"),
    ]);
    if (!projRes.ok) {
      setLoadError(projRes.status === 404 ? "Edit not found" : "Could not load edit");
      return;
    }
    const data = (await projRes.json()) as { project: Project };
    setProject(data.project);
    if (mediaRes.ok) setLibrary((await mediaRes.json()) as MediaItem[]);
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load]);

  // Fit the zoom to the timeline once, when a non-empty project first loads.
  useEffect(() => {
    if (!project || didFit.current) return;
    const raf = requestAnimationFrame(() => {
      const end = timelineEndMs(project.tracks);
      if (end > 0 && timelineBox.current) {
        didFit.current = true;
        const w = timelineBox.current.clientWidth - 120;
        setPxPerSec(clamp((w * 1000) / end, 2, 200));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [project]);

  const mediaById = new Map(library.map((m) => [m.id, m]));
  const mediaTitle = (id: string) => mediaById.get(id)?.title ?? "(missing from library)";
  const mediaDurMs = (id: string): number | null => {
    const probed = durCache.current.get(id);
    if (probed) return probed;
    const lib = mediaById.get(id)?.duration;
    return lib ? Math.round(lib * 1000) : null;
  };

  // ---------- undo / redo + mutation plumbing ----------
  const snapshot = (p: Project): Doc =>
    structuredClone({ tracks: p.tracks, markers: p.markers });

  const lastOp = useRef({ tag: "", at: 0 });

  const pushUndo = () => {
    const p = projectRef.current;
    if (!p) return;
    undoStack.current.push(snapshot(p));
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
  };

  /** All timeline mutations flow through here: undo point, apply, ripple.
   *  `coalesce` groups rapid same-source changes (slider drags, typing) into
   *  one undo step. Kept outside the setState updater — StrictMode runs
   *  updaters twice in dev, which would double-push undo entries. */
  const updateDoc = (fn: (doc: Doc) => void, opts?: { coalesce?: string }) => {
    const p = projectRef.current;
    if (!p) return;
    const now = performance.now();
    const skip =
      opts?.coalesce !== undefined &&
      opts.coalesce === lastOp.current.tag &&
      now - lastOp.current.at < 800;
    if (!skip) pushUndo();
    lastOp.current = { tag: opts?.coalesce ?? "", at: now };
    const doc = snapshot(p);
    fn(doc);
    doc.tracks.forEach((t, i) => ripple(t, i));
    setProject({ ...p, tracks: doc.tracks, markers: doc.markers });
    setDirty(true);
  };

  const undo = () => {
    const p = projectRef.current;
    const prev = undoStack.current.pop();
    if (!p || !prev) return;
    redoStack.current.push(snapshot(p));
    setProject({ ...p, ...structuredClone(prev) });
    setDirty(true);
  };
  const redo = () => {
    const p = projectRef.current;
    const next = redoStack.current.pop();
    if (!p || !next) return;
    undoStack.current.push(snapshot(p));
    setProject({ ...p, ...structuredClone(next) });
    setDirty(true);
  };

  // ---------- playback engine ----------
  const clipVolume = (clip: Clip, track: Track, cur: number) => {
    const d = durMs(clip);
    const rel = cur - clip.startMs;
    let fade = 1;
    if (clip.fadeInMs > 0 && rel < clip.fadeInMs) fade = rel / clip.fadeInMs;
    if (clip.fadeOutMs > 0 && d - rel < clip.fadeOutMs)
      fade = Math.min(fade, (d - rel) / clip.fadeOutMs);
    return clamp(track.volume * Math.pow(10, clip.gainDb / 20) * clamp(fade, 0, 1), 0, 1);
  };

  /**
   * Corrective pass: every feed track slaves independently (GarageBand).
   * Picture comes from the program feed only.
   */
  const syncElements = useCallback(
    (cur: number, isPlaying: boolean) => {
      const p = projectRef.current;
      if (!p) return;
      const programId =
        programTrackId && p.tracks.some((t) => t.id === programTrackId)
          ? programTrackId
          : p.tracks.find((t) => t.kind === "video")?.id ?? null;
      let nextActiveVideo: string | null = null;
      p.tracks.forEach((track) => {
        // Park the next region on this feed so hits are clean
        let nextClipId: string | null = null;
        for (const c of track.clips)
          if (c.startMs > cur) {
            nextClipId = c.id;
            break;
          }
        const trackSilent =
          track.muted ||
          (soloTrackId != null && soloTrackId !== track.id);
        for (const clip of track.clips) {
          const el = els.current.get(clip.id);
          if (!el) continue;
          const d = durMs(clip);
          const active = cur >= clip.startMs && cur < clip.startMs + d;
          const target =
            (clip.srcInMs + (cur - clip.startMs) * clip.speed) / 1000;
          el.muted = clip.muted || trackSilent;
          if (!active) {
            if (!el.paused) el.pause();
            if (
              clip.id === nextClipId &&
              Math.abs(el.currentTime - clip.srcInMs / 1000) > 0.05
            )
              el.currentTime = clip.srcInMs / 1000;
            continue;
          }
          // Program feed drives the monitor
          if (track.kind === "video" && track.id === programId && !nextActiveVideo) {
            nextActiveVideo = clip.id;
          }
          el.volume = clipVolume(clip, track, cur);
          if (isPlaying) {
            if (el.paused) {
              el.currentTime = target;
              void el.play().catch(() => {});
            }
            const drift = el.currentTime - target;
            if (Math.abs(drift) > 0.12) {
              el.currentTime = target;
              el.playbackRate = clip.speed;
            } else if (Math.abs(drift) > 0.03) {
              el.playbackRate = clip.speed * (drift > 0 ? 0.95 : 1.05);
            } else {
              el.playbackRate = clip.speed;
            }
          } else {
            if (!el.paused) el.pause();
            if (Math.abs(el.currentTime - target) > 0.03) el.currentTime = target;
          }
        }
      });
      setActiveVideoId((prev) =>
        prev === nextActiveVideo ? prev : nextActiveVideo,
      );
    },
    [programTrackId, soloTrackId],
  );

  // Master clock: rAF advances the playhead, fades track smoothly; a slower
  // interval does the heavier seek/drift correction.
  useEffect(() => {
    if (!playing) return;
    clockBase.current = { ms: curRef.current, perf: performance.now() };
    let raf = 0;
    let lastActive = activeVideoId;
    const frame = () => {
      const p = projectRef.current;
      if (!p) return;
      const end = timelineEndMs(p.tracks);
      const cur = clockBase.current.ms + (performance.now() - clockBase.current.perf);
      if (end > 0 && cur >= end) {
        setCurMs(end);
        syncElements(end, false);
        setPlaying(false);
        return;
      }
      setCurMs(cur);
      // Cheap per-frame pass: fades + snap when program feed region flips.
      const programId =
        programTrackId && p.tracks.some((t) => t.id === programTrackId)
          ? programTrackId
          : p.tracks.find((t) => t.kind === "video")?.id ?? null;
      let active: string | null = null;
      p.tracks.forEach((track) => {
        for (const clip of track.clips) {
          const el = els.current.get(clip.id);
          if (!el) continue;
          const d = durMs(clip);
          if (cur >= clip.startMs && cur < clip.startMs + d) {
            el.volume = clipVolume(clip, track, cur);
            if (track.id === programId && track.kind === "video" && !active)
              active = clip.id;
          }
        }
      });
      if (active !== lastActive) {
        lastActive = active;
        syncElements(cur, true);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // The interval advances the clock too — rAF is suspended in hidden
    // tabs, and audio should keep playing when the tab is backgrounded.
    const interval = setInterval(() => {
      const p = projectRef.current;
      if (!p) return;
      const cur = clockBase.current.ms + (performance.now() - clockBase.current.perf);
      const end = timelineEndMs(p.tracks);
      if (end > 0 && cur >= end) {
        curRef.current = end;
        setCurMs(end);
        syncElements(end, false);
        setPlaying(false);
        return;
      }
      curRef.current = cur;
      setCurMs(cur);
      syncElements(cur, true);
    }, 200);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, syncElements]);

  const seek = (ms: number) => {
    const p = projectRef.current;
    const end = p ? timelineEndMs(p.tracks) : 0;
    const next = clamp(ms, 0, Math.max(end, 0));
    curRef.current = next;
    setCurMs(next);
    clockBase.current = { ms: next, perf: performance.now() };
    syncElements(next, playingRef.current);
  };

  const togglePlay = () => {
    const p = projectRef.current;
    if (!p || timelineEndMs(p.tracks) === 0) return;
    if (playingRef.current) {
      setPlaying(false);
      syncElements(curRef.current, false);
    } else {
      if (curRef.current >= timelineEndMs(p.tracks)) seek(0);
      setPlaying(true);
    }
  };

  // Pause the engine whenever the doc changes shape underneath it.
  useEffect(() => {
    syncElements(curRef.current, playingRef.current);
  }, [project, syncElements]);

  // ---------- clip operations ----------
  const findClip = (doc: Doc, clipId: string): { track: Track; idx: number } | null => {
    for (const track of doc.tracks) {
      const idx = track.clips.findIndex((c) => c.id === clipId);
      if (idx >= 0) return { track, idx };
    }
    return null;
  };

  const probeDuration = (mediaId: string, kind: "video" | "audio") =>
    new Promise<number | null>((resolve) => {
      const el = document.createElement(kind);
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        durCache.current.set(mediaId, Math.round(el.duration * 1000));
        resolve(Math.round(el.duration * 1000));
        el.removeAttribute("src");
      };
      el.onerror = () => resolve(null);
      el.src = fileUrl(mediaId);
    });

  /**
   * GarageBand rule: every import is a new instrument/feed track.
   * Full take as one region from t=0 (nudge later to line up).
   * Camera mics muted by default so board mix carries the sound.
   */
  const addMediaToTimeline = async (m: MediaItem) => {
    if (!project) return;
    let dur = mediaDurMs(m.id);
    if (!dur) dur = await probeDuration(m.id, m.kind);
    if (!dur) {
      alert(
        "Could not read that file's duration — try again in a second, or open it once in Media.",
      );
      return;
    }
    const clipId = crypto.randomUUID();
    const trackId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const muteCameraMic = m.kind === "video";
    updateDoc((doc) => {
      const name = feedLabel(m.kind, doc.tracks, m.title);
      const track: Track = {
        id: trackId,
        kind: m.kind,
        name,
        orderIdx: doc.tracks.length,
        muted: false,
        locked: false,
        volume: 1,
        clips: [
          {
            id: clipId,
            mediaId: m.id,
            startMs: 0,
            srcInMs: 0,
            srcOutMs: dur,
            speed: 1,
            muted: muteCameraMic,
            gainDb: 0,
            opacity: 1,
            fadeInMs: 0,
            fadeOutMs: 0,
            label: m.title,
            effects: [],
          },
        ],
      };
      // Videos stack above audio (mixer-style)
      if (m.kind === "video") {
        const firstAudio = doc.tracks.findIndex((t) => t.kind === "audio");
        if (firstAudio >= 0) doc.tracks.splice(firstAudio, 0, track);
        else doc.tracks.push(track);
      } else {
        doc.tracks.push(track);
      }
      doc.tracks.forEach((t, i) => {
        t.orderIdx = i;
      });
    });
    setSelectedId(clipId);
    if (m.kind === "video") {
      setProgramTrackId((prev) => prev ?? trackId);
    }
    setAddPick("");
  };

  const addToTimeline = async () => {
    const m = mediaById.get(addPick);
    if (!m) return;
    await addMediaToTimeline(m);
  };

  const onImported = async (item: MediaItem) => {
    setLibrary((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      return [item, ...prev];
    });
    await addMediaToTimeline(item);
  };

  const removeClip = (clipId: string) => {
    updateDoc((doc) => {
      const found = findClip(doc, clipId);
      if (!found) return;
      found.track.clips.splice(found.idx, 1);
      doc.markers = doc.markers.filter((mk) => mk.clipId !== clipId);
    });
    setSelectedId((s) => (s === clipId ? null : s));
  };

  /** The blade. Splits the clip under the playhead (selected one first). */
  const splitAtPlayhead = () => {
    const p = projectRef.current;
    if (!p) return;
    const cur = Math.round(curRef.current);
    const contains = (c: Clip) => cur > c.startMs + MIN_CLIP_MS && cur < c.startMs + durMs(c) - MIN_CLIP_MS;
    let targetId: string | null = null;
    for (const track of p.tracks)
      for (const c of track.clips) {
        if (!contains(c)) continue;
        if (c.id === selectedId) targetId = c.id;
        targetId ??= c.id;
      }
    if (!targetId) return;
    updateDoc((doc) => {
      const found = findClip(doc, targetId);
      if (!found) return;
      const c = found.track.clips[found.idx];
      const relMs = cur - c.startMs;
      const srcSplit = Math.round(c.srcInMs + relMs * c.speed);
      const second: Clip = {
        ...structuredClone(c),
        id: crypto.randomUUID(),
        srcInMs: srcSplit,
        startMs: cur,
        fadeInMs: 0,
        effects: [],
      };
      c.srcOutMs = srcSplit;
      c.fadeOutMs = 0;
      found.track.clips.splice(found.idx + 1, 0, second);
      for (const mk of doc.markers) {
        if (mk.clipId !== c.id) continue;
        if (mk.tMs >= relMs) {
          mk.clipId = second.id;
          mk.tMs -= relMs;
        }
      }
    });
  };

  /** iMovie's detach audio: mute the picture, give the sound its own clip. */
  const detachAudio = (clipId: string) => {
    updateDoc((doc) => {
      const found = findClip(doc, clipId);
      if (!found || found.track.kind !== "video") return;
      const c = found.track.clips[found.idx];
      const audio = doc.tracks.find((t) => t.kind === "audio");
      if (!audio) return;
      c.muted = true;
      audio.clips.push({
        ...structuredClone(c),
        id: crypto.randomUUID(),
        muted: false,
        label: c.label ? `${c.label} — audio` : "detached audio",
        effects: [],
      });
      audio.clips.sort((a, b) => a.startMs - b.startMs);
    });
  };

  const addMarker = () => {
    const p = projectRef.current;
    if (!p) return;
    const cur = Math.round(curRef.current);
    let clipId: string | null = null;
    let tMs = cur;
    const host =
      (selectedId &&
        p.tracks
          .flatMap((t) => t.clips)
          .find((c) => c.id === selectedId && cur >= c.startMs && cur < c.startMs + durMs(c))) ||
      p.tracks[0]?.clips.find((c) => cur >= c.startMs && cur < c.startMs + durMs(c));
    if (host) {
      clipId = host.id;
      tMs = cur - host.startMs;
    }
    updateDoc((doc) => {
      doc.markers.push({
        id: crypto.randomUUID(),
        clipId,
        tMs,
        label: `Marker ${doc.markers.length + 1}`,
        note: null,
        color: null,
        createdAt: new Date().toISOString(),
      });
    });
  };

  const patchClip = (clipId: string, patch: Partial<Clip>) => {
    updateDoc(
      (doc) => {
        const found = findClip(doc, clipId);
        if (!found) return;
        Object.assign(found.track.clips[found.idx], patch);
      },
      { coalesce: `patch:${clipId}` }
    );
  };

  // ---------- drag: move / reorder / trim ----------
  const dragState = useRef<{
    clipId: string;
    trackIdx: number;
    mode: "move" | "trim-l" | "trim-r";
    startX: number;
    orig: Clip;
    origIdx: number;
    undoPushed: boolean;
  } | null>(null);

  const pxPerMs = pxPerSec / 1000;

  const onClipPointerDown = (e: React.PointerEvent, trackIdx: number, clip: Clip) => {
    if (e.button !== 0) return;
    setSelectedId(clip.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mode: "move" | "trim-l" | "trim-r" =
      x < 10 ? "trim-l" : x > rect.width - 10 ? "trim-r" : "move";
    dragState.current = {
      clipId: clip.id,
      trackIdx,
      mode,
      startX: e.clientX,
      orig: structuredClone(clip),
      origIdx: -1,
      undoPushed: false,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // pointer already gone (or synthetic) — drag just won't capture
    }
  };

  const onClipPointerMove = (e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const dxMs = (e.clientX - ds.startX) / pxPerMs;
    if (Math.abs(e.clientX - ds.startX) < 3) return;
    if (!ds.undoPushed) {
      pushUndo();
      ds.undoPushed = true;
    }
    const p = projectRef.current;
    if (!p) return;
    {
      const doc = snapshot(p);
      const found = findClip(doc, ds.clipId);
      if (!found) return;
      const { track } = found;
      const c = track.clips[found.idx];
      const maxSrc = mediaDurMs(c.mediaId) ?? Number.POSITIVE_INFINITY;
      if (ds.mode === "trim-l") {
        c.srcInMs = Math.round(
          clamp(ds.orig.srcInMs + dxMs * c.speed, 0, ds.orig.srcOutMs - MIN_CLIP_MS)
        );
        if (track.kind === "audio")
          c.startMs = Math.round(ds.orig.startMs + (c.srcInMs - ds.orig.srcInMs) / c.speed);
      } else if (ds.mode === "trim-r") {
        c.srcOutMs = Math.round(
          clamp(ds.orig.srcOutMs + dxMs * c.speed, ds.orig.srcInMs + MIN_CLIP_MS, maxSrc)
        );
      } else if (track.kind === "audio") {
        let next = Math.round(ds.orig.startMs + dxMs);
        // Snap to the playhead when close.
        if (Math.abs(next - curRef.current) < 8 / pxPerMs) next = Math.round(curRef.current);
        c.startMs = Math.max(0, next);
        track.clips.sort((a, b) => a.startMs - b.startMs);
      } else {
        // Storyline reorder: place the clip by the pointer's midpoint walk.
        const lane = laneRef.current;
        if (lane) {
          const laneX = e.clientX - lane.getBoundingClientRect().left;
          const others = track.clips.filter((x) => x.id !== c.id);
          let insert = others.length;
          let acc = 0;
          for (let i = 0; i < others.length; i++) {
            const w = durMs(others[i]) * pxPerMs;
            if (laneX < acc + w / 2) {
              insert = i;
              break;
            }
            acc += w;
          }
          track.clips = [...others.slice(0, insert), c, ...others.slice(insert)];
        }
      }
      doc.tracks.forEach((t, i) => ripple(t, i));
      setProject({ ...p, tracks: doc.tracks, markers: doc.markers });
      setDirty(true);
    }
  };

  const onClipPointerUp = () => {
    dragState.current = null;
  };

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)
        return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "b" || e.key === "s") {
        splitAtPlayhead();
      } else if (e.key === "m") {
        addMarker();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedId) {
          e.preventDefault();
          removeClip(selectedId);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 1000 : 33;
        seek(curRef.current + (e.key === "ArrowLeft" ? -step : step));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---------- save ----------
  const save = async () => {
    const p = projectRef.current;
    if (!p) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/edit-projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.title,
          notes: p.notes,
          tracks: p.tracks,
          markers: p.markers,
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

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ---------- render ----------
  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-red-300">{loadError}</p>
        <Link href="/admin/edits" className="text-ca-gold underline">
          Back to timeline
        </Link>
      </div>
    );
  }
  if (!project) return <p className="text-ca-muted">Loading…</p>;

  const end = timelineEndMs(project.tracks);
  const laneMs = Math.max(end + 5000, 60000);
  const laneW = laneMs * pxPerMs;
  const selected = project.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedId) ?? null;
  const selectedTrack = selected
    ? project.tracks.find((t) => t.clips.some((c) => c.id === selected.id))
    : null;
  const markerAbs = (mk: Marker) => {
    if (!mk.clipId) return mk.tMs;
    const host = project.tracks.flatMap((t) => t.clips).find((c) => c.id === mk.clipId);
    return host ? host.startMs + mk.tMs : mk.tMs;
  };

  // Ruler tick spacing that keeps labels ~90px apart at any zoom.
  const steps = [100, 250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000];
  const tickMs = steps.find((s) => s * pxPerMs >= 90) ?? 600000;
  const ticks: number[] = [];
  for (let t = 0; t <= laneMs; t += tickMs) ticks.push(t);

  const allClips = project.tracks.flatMap((t, ti) =>
    t.clips.map((c) => ({ clip: c, track: t, trackIdx: ti }))
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/edits" className="text-xs uppercase tracking-[0.2em] text-ca-gold">
            ← Timeline
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
          {saving ? "Saving…" : dirty ? "Save edit" : "Saved"}
        </button>
      </header>

      {/* Monitor — program feed only (other video feeds still play for mix/sync) */}
      <section className="relative aspect-video w-full overflow-hidden rounded-xl border border-ca-border bg-black">
        {allClips.map(({ clip, track }) => {
          const m = mediaById.get(clip.mediaId);
          const isProgramVideo =
            track.kind === "video" &&
            (programTrackId
              ? track.id === programTrackId
              : track.id === project.tracks.find((t) => t.kind === "video")?.id);
          if (track.kind === "video") {
            return (
              <video
                key={clip.id}
                ref={(el) => {
                  if (el) els.current.set(clip.id, el);
                  else els.current.delete(clip.id);
                }}
                src={fileUrl(clip.mediaId)}
                playsInline
                preload="auto"
                onLoadedMetadata={(e) =>
                  durCache.current.set(
                    clip.mediaId,
                    Math.round(e.currentTarget.duration * 1000),
                  )
                }
                className={
                  isProgramVideo
                    ? "absolute inset-0 h-full w-full object-contain"
                    : "hidden"
                }
                style={
                  isProgramVideo
                    ? {
                        visibility:
                          activeVideoId === clip.id ? "visible" : "hidden",
                        opacity: clip.opacity,
                      }
                    : undefined
                }
              />
            );
          }
          return m?.kind === "audio" ? (
            <audio
              key={clip.id}
              ref={(el) => {
                if (el) els.current.set(clip.id, el);
                else els.current.delete(clip.id);
              }}
              src={fileUrl(clip.mediaId)}
              preload="auto"
              onLoadedMetadata={(e) =>
                durCache.current.set(
                  clip.mediaId,
                  Math.round(e.currentTarget.duration * 1000),
                )
              }
            />
          ) : (
            <video
              key={clip.id}
              ref={(el) => {
                if (el) els.current.set(clip.id, el);
                else els.current.delete(clip.id);
              }}
              src={fileUrl(clip.mediaId)}
              playsInline
              preload="auto"
              className="hidden"
              onLoadedMetadata={(e) =>
                durCache.current.set(
                  clip.mediaId,
                  Math.round(e.currentTarget.duration * 1000),
                )
              }
            />
          );
        })}
        {!activeVideoId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-sm text-zinc-500">
            {project.tracks.length === 0 ? (
              <>
                <p className="text-zinc-400">Empty multi-track session</p>
                <p className="text-xs">
                  Import each feed like an instrument — Cam A, Cam B, board mix
                </p>
              </>
            ) : project.tracks.every((t) => t.kind === "audio") ? (
              <p>▶ Multi-track audio · no video feeds</p>
            ) : (
              <p>— no program video at playhead —</p>
            )}
          </div>
        )}
        {programTrackId && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ca-gold">
            Program ·{" "}
            {project.tracks.find((t) => t.id === programTrackId)?.name ?? "—"}
          </div>
        )}
      </section>

      {/* Import + transport (iMovie-style) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-ca-panel/60 px-4 py-3">
          <ImportMediaPair onImported={onImported} />
          <p className="max-w-md text-xs leading-relaxed text-ca-muted sm:ml-1">
            Each import = one feed track (like a GarageBand instrument). Camera
            mics start muted — keep board mix hot. Drag regions to line up; set{" "}
            <span className="text-ca-gold">Program</span> to choose which camera
            is on the monitor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={togglePlay}
            className="rounded-full bg-white/10 px-5 py-1.5 text-sm text-white hover:bg-white/20"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <span className="w-28 font-mono text-sm text-ca-gold">
            {fmtTime(curMs)}{" "}
            <span className="text-zinc-500">/ {fmtTime(end)}</span>
          </span>
          <div className="mx-1 h-5 w-px bg-white/10" />
          <button
            onClick={splitAtPlayhead}
            title="Split at playhead (B)"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:border-ca-gold"
          >
            ✂ Split
          </button>
          <button
            onClick={addMarker}
            title="Add marker (M)"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:border-ca-gold"
          >
            ◆ Marker
          </button>
          <button
            onClick={undo}
            title="Undo (⌘Z)"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:border-ca-gold"
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            title="Redo (⇧⌘Z)"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:border-ca-gold"
          >
            ↪ Redo
          </button>
          <div className="mx-1 h-5 w-px bg-white/10" />
          <select
            value={addPick}
            onChange={(e) => setAddPick(e.target.value)}
            className="rounded-lg border border-white/15 bg-ca-ink px-3 py-1.5 text-sm text-white outline-none focus:border-ca-gold"
          >
            <option value="">— library —</option>
            {library.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kind === "audio" ? "♪" : "▸"} {m.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => void addToTimeline()}
            disabled={!addPick}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-zinc-200 hover:border-ca-gold disabled:opacity-40"
          >
            + Add to timeline
          </button>
          <div className="ml-auto flex items-center gap-1 text-xs text-zinc-400">
            <span>zoom</span>
            <input
              type="range"
              min={2}
              max={200}
              value={pxPerSec}
              onChange={(e) => setPxPerSec(Number(e.target.value))}
              className="w-28 accent-[#d3a94f]"
            />
            <button
              onClick={() => {
                if (end > 0 && timelineBox.current)
                  setPxPerSec(
                    clamp(
                      ((timelineBox.current.clientWidth - 120) * 1000) / end,
                      2,
                      200,
                    ),
                  );
              }}
              className="rounded border border-white/15 px-2 py-0.5 hover:border-ca-gold"
            >
              Fit
            </button>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section
        ref={timelineBox}
        className="overflow-x-auto rounded-xl border border-ca-border bg-ca-panel"
      >
        <div style={{ width: laneW + 96 }} className="relative select-none">
          {/* Ruler */}
          <div
            className="relative ml-24 h-6 cursor-pointer border-b border-white/10"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / pxPerMs);
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // scrub still lands; drag-follow just won't capture
              }
            }}
            onPointerMove={(e) => {
              if (e.buttons !== 1) return;
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / pxPerMs);
            }}
          >
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 text-[10px] text-zinc-500"
                style={{ left: t * pxPerMs + 3 }}
              >
                {fmtTime(t)}
              </span>
            ))}
            {/* Project-level markers pinned to the timeline */}
            {project.markers
              .filter((mk) => !mk.clipId)
              .map((mk) => (
                <span
                  key={mk.id}
                  title={mk.label}
                  className="absolute bottom-0 h-2 w-2 -translate-x-1/2 rotate-45 bg-ca-gold"
                  style={{ left: mk.tMs * pxPerMs }}
                />
              ))}
          </div>

          {/* Feed tracks (GarageBand-style instrument lanes) */}
          {project.tracks.length === 0 && (
            <div className="ml-28 py-8 text-sm text-zinc-500">
              No feeds yet — import video and audio above.
            </div>
          )}
          {project.tracks.map((track, ti) => {
            const isProgram =
              track.kind === "video" &&
              (programTrackId === track.id ||
                (!programTrackId &&
                  track.id ===
                    project.tracks.find((t) => t.kind === "video")?.id));
            const isSolo = soloTrackId === track.id;
            return (
              <div
                key={track.id}
                className={`flex border-b border-white/5 ${
                  isProgram ? "bg-ca-gold/5" : ""
                }`}
              >
                <div className="flex w-36 shrink-0 flex-col justify-center gap-1 border-r border-white/10 px-2 py-1.5">
                  <input
                    value={track.name}
                    onChange={(e) =>
                      updateDoc(
                        (doc) => {
                          const t = doc.tracks.find((x) => x.id === track.id);
                          if (t) t.name = e.target.value.slice(0, 40);
                        },
                        { coalesce: `rename-${track.id}` },
                      )
                    }
                    className="w-full truncate bg-transparent text-[11px] font-semibold text-zinc-200 outline-none focus:text-white"
                    title="Feed name"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateDoc((doc) => {
                          const t = doc.tracks.find((x) => x.id === track.id);
                          if (t) t.muted = !t.muted;
                        })
                      }
                      title="Mute feed"
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
                        track.muted
                          ? "bg-red-500/20 text-red-300"
                          : "bg-white/5 text-zinc-500 hover:text-white"
                      }`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSoloTrackId((s) =>
                          s === track.id ? null : track.id,
                        )
                      }
                      title="Solo feed"
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
                        isSolo
                          ? "bg-amber-500/25 text-amber-200"
                          : "bg-white/5 text-zinc-500 hover:text-white"
                      }`}
                    >
                      S
                    </button>
                    {track.kind === "video" && (
                      <button
                        type="button"
                        onClick={() => setProgramTrackId(track.id)}
                        title="Program — show this camera on the monitor"
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
                          isProgram
                            ? "bg-ca-gold/25 text-ca-gold"
                            : "bg-white/5 text-zinc-500 hover:text-white"
                        }`}
                      >
                        P
                      </button>
                    )}
                    <span className="text-[9px] uppercase tracking-wider text-zinc-600">
                      {track.kind === "video" ? "cam" : "audio"}
                    </span>
                  </div>
                </div>
                <div
                  ref={ti === 0 ? laneRef : undefined}
                  className={`relative ${track.kind === "video" ? "h-14" : "h-12"}`}
                  style={{ width: laneW }}
                >
                  {track.clips.map((clip) => {
                    const w = durMs(clip) * pxPerMs;
                    const isSel = clip.id === selectedId;
                    return (
                      <div
                        key={clip.id}
                        onPointerDown={(e) => onClipPointerDown(e, ti, clip)}
                        onPointerMove={onClipPointerMove}
                        onPointerUp={onClipPointerUp}
                        title={mediaTitle(clip.mediaId)}
                        className={`absolute top-1 bottom-1 overflow-hidden rounded-md border px-1.5 py-0.5 ${
                          track.kind === "video"
                            ? "bg-sky-500/15"
                            : "bg-emerald-500/15"
                        } ${
                          isSel
                            ? "border-ca-gold"
                            : "border-white/15 hover:border-white/40"
                        }`}
                        style={{
                          left: clip.startMs * pxPerMs,
                          width: Math.max(w, 6),
                        }}
                      >
                        <p className="truncate text-[11px] font-semibold text-white">
                          {clip.muted ? "🔇 " : ""}
                          {clip.label || mediaTitle(clip.mediaId)}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {fmtTime(durMs(clip))}
                          {clip.startMs !== 0
                            ? ` · offset ${fmtTime(clip.startMs)}`
                            : ""}
                        </p>
                        {project.markers
                          .filter((mk) => mk.clipId === clip.id)
                          .map((mk) => (
                            <span
                              key={mk.id}
                              title={mk.label}
                              className="absolute bottom-0.5 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-ca-gold"
                              style={{ left: mk.tMs * pxPerMs }}
                            />
                          ))}
                        <span className="absolute inset-y-0 left-0 w-[10px] cursor-col-resize" />
                        <span className="absolute inset-y-0 right-0 w-[10px] cursor-col-resize" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-ca-gold"
            style={{ left: 96 + curMs * pxPerMs }}
          >
            <div className="-ml-[5px] h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#d3a94f]" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
          <p className="text-[11px] text-zinc-500">
            M mute · S solo · P program camera · drag = offset/sync · edges =
            trim · B split · space play · ⌘Z undo
          </p>
          <span className="text-[11px] text-zinc-600">
            Feeds are parallel — not an iMovie storyline
          </span>
        </div>
      </section>

      {/* Inspector */}
      {selected && selectedTrack && (
        <section className="rounded-xl border border-ca-border bg-ca-panel p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Clip</p>
              <input
                value={selected.label}
                placeholder={mediaTitle(selected.mediaId)}
                onChange={(e) => patchClip(selected.id, { label: e.target.value })}
                className="w-44 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-400"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={selected.muted}
                onChange={(e) => patchClip(selected.id, { muted: e.target.checked })}
                className="accent-[#d3a94f]"
              />
              mute
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              gain
              <input
                type="range"
                min={-24}
                max={12}
                step={1}
                value={selected.gainDb}
                onChange={(e) => patchClip(selected.id, { gainDb: Number(e.target.value) })}
                className="w-24 accent-[#d3a94f]"
              />
              <span className="w-10 text-right font-mono">{selected.gainDb} dB</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              fade in
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={selected.fadeInMs / 1000}
                onChange={(e) =>
                  patchClip(selected.id, {
                    fadeInMs: Math.max(0, Math.round(Number(e.target.value) * 1000)),
                  })
                }
                className="w-14 rounded border border-white/15 bg-transparent px-1 py-0.5 text-right"
              />
              s
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              fade out
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={selected.fadeOutMs / 1000}
                onChange={(e) =>
                  patchClip(selected.id, {
                    fadeOutMs: Math.max(0, Math.round(Number(e.target.value) * 1000)),
                  })
                }
                className="w-14 rounded border border-white/15 bg-transparent px-1 py-0.5 text-right"
              />
              s
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              speed
              <input
                type="number"
                min={0.25}
                max={4}
                step={0.05}
                value={selected.speed}
                onChange={(e) =>
                  patchClip(selected.id, {
                    speed: clamp(Number(e.target.value) || 1, 0.25, 4),
                  })
                }
                className="w-16 rounded border border-white/15 bg-transparent px-1 py-0.5 text-right"
              />
              ×
            </label>
            <div className="ml-auto flex items-center gap-3">
              {selectedTrack.kind === "video" && (
                <button
                  onClick={() => detachAudio(selected.id)}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-zinc-200 hover:border-ca-gold"
                >
                  Detach audio
                </button>
              )}
              <button
                onClick={() => removeClip(selected.id)}
                className="text-xs text-zinc-500 hover:text-red-300"
              >
                Delete clip
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Markers */}
      {project.markers.length > 0 && (
        <section className="space-y-1">
          <h2 className="font-semibold text-white">Markers</h2>
          <ul className="space-y-1">
            {[...project.markers]
              .sort((a, b) => markerAbs(a) - markerAbs(b))
              .map((mk) => (
                <li key={mk.id} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => seek(markerAbs(mk))}
                    className="w-16 text-left font-mono text-ca-gold hover:underline"
                  >
                    {fmtTime(markerAbs(mk))}
                  </button>
                  <input
                    value={mk.label}
                    onChange={(e) =>
                      updateDoc((doc) => {
                        const m = doc.markers.find((x) => x.id === mk.id);
                        if (m) m.label = e.target.value;
                      })
                    }
                    className="flex-1 bg-transparent text-zinc-200 outline-none"
                  />
                  <span className="text-[11px] text-zinc-600">
                    {mk.clipId ? "on clip" : "timeline"}
                  </span>
                  <button
                    onClick={() =>
                      updateDoc((doc) => {
                        doc.markers = doc.markers.filter((x) => x.id !== mk.id);
                      })
                    }
                    className="text-xs text-zinc-500 hover:text-red-300"
                  >
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-1 font-semibold text-white">Notes</h2>
        <textarea
          value={project.notes}
          onChange={(e) => {
            setProject({ ...project, notes: e.target.value });
            setDirty(true);
          }}
          rows={3}
          placeholder="Cut list, song order, delivery notes…"
          className="w-full rounded-lg border border-ca-border bg-ca-panel p-3 text-sm text-zinc-200 outline-none focus:border-ca-gold"
        />
      </section>
    </div>
  );
}
