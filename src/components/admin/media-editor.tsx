"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem, MediaMarker, Projection } from "@/lib/media-shared";
import { formatBytes } from "@/lib/media-shared";
import { Video360 } from "@/components/video-360";

function fmtTime(t: number) {
  if (!isFinite(t)) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const frac = Math.floor((t % 1) * 10);
  const mmss = `${m}:${String(s).padStart(2, "0")}.${frac}`;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${frac}` : mmss;
}

export function MediaEditor({ id }: { id: string }) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState("");
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState<number | null>(null);
  const [markers, setMarkers] = useState<MediaMarker[]>([]);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewTrim, setPreviewTrim] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projection, setProjection] = useState<Projection>("flat");
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/admin/media/${id}`).then(async (res) => {
      if (!res.ok) return setMissing(true);
      const m: MediaItem = await res.json();
      setItem(m);
      setTitle(m.title);
      setTrimIn(m.edit.trimIn);
      setTrimOut(m.edit.trimOut);
      setMarkers(m.edit.markers);
      setProjection(m.projection ?? "flat");
      if (m.duration) setDuration(m.duration);
    });
  }, [id]);

  const setProjectionPersist = useCallback(
    (p: Projection) => {
      setProjection(p);
      fetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projection: p }),
      });
    },
    [id]
  );

  const copyReviewLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/review/${id}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [id]);

  // Playback clock + trim-preview enforcement
  const onTimeUpdate = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
    const end = trimOut ?? duration;
    if (previewTrim && end > 0 && el.currentTime >= end) {
      el.pause();
      el.currentTime = trimIn;
    }
  }, [previewTrim, trimIn, trimOut, duration]);

  const onLoadedMetadata = useCallback(() => {
    const el = mediaRef.current;
    if (!el || !isFinite(el.duration)) return;
    setDuration(el.duration);
    // Persist duration the first time the browser reports it
    fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration: el.duration }),
    });
  }, [id]);

  const seek = useCallback((t: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t);
    setCurrent(el.currentTime);
  }, []);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      if (previewTrim && (el.currentTime < trimIn || el.currentTime >= (trimOut ?? duration))) {
        el.currentTime = trimIn;
      }
      el.play();
    } else {
      el.pause();
    }
  }, [previewTrim, trimIn, trimOut, duration]);

  const addMarker = useCallback(() => {
    const m: MediaMarker = {
      id: Math.random().toString(36).slice(2, 10),
      t: current,
      label: `Marker ${markers.length + 1}`,
      by: "admin",
    };
    setMarkers((prev) => [...prev, m].sort((a, b) => a.t - b.t));
    setDirty(true);
  }, [current, markers.length]);

  const save = useCallback(async () => {
    setSaving(true);
    await fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, edit: { trimIn, trimOut, markers } }),
    });
    setSaving(false);
    setDirty(false);
  }, [id, title, trimIn, trimOut, markers]);

  // Keyboard shortcuts: space = play, I/O = trim, M = marker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "i" || e.key === "I") {
        setTrimIn(current);
        setDirty(true);
      } else if (e.key === "o" || e.key === "O") {
        setTrimOut(current);
        setDirty(true);
      } else if (e.key === "m" || e.key === "M") {
        addMarker();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, addMarker, current]);

  if (missing) {
    return (
      <div className="text-ca-muted">
        File not found.{" "}
        <Link href="/admin/media" className="text-ca-gold hover:underline">
          Back to library
        </Link>
      </div>
    );
  }
  if (!item) return <p className="text-sm text-ca-muted">Loading…</p>;

  const src = `/api/admin/media/${id}/file`;
  const end = trimOut ?? duration;
  const pct = (t: number) => (duration > 0 ? Math.min(100, (t / duration) * 100) : 0);

  const timelineSeek = (e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || duration === 0) return;
    seek(((e.clientX - rect.left) / rect.width) * duration);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/media" className="text-sm text-ca-muted hover:text-white">
            ← Library
          </Link>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-display text-2xl font-semibold text-white focus:border-ca-border focus:bg-ca-panel"
            aria-label="Title"
          />
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-ca-gold">unsaved changes</span>}
          <button
            type="button"
            onClick={copyReviewLink}
            className="rounded-full border border-ca-border px-4 py-2 text-sm text-ca-muted transition-colors hover:border-ca-gold hover:text-white"
          >
            {copied ? "Link copied!" : "Copy review link"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-full bg-ca-gold px-5 py-2 text-sm font-semibold text-ca-ink transition-colors hover:bg-ca-gold-light disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-ca-muted">
        {item.kind} · {formatBytes(item.size)} · uploaded{" "}
        {new Date(item.uploadedAt).toLocaleString()}
      </div>

      {/* Player */}
      <div className="relative mt-6 overflow-hidden rounded-2xl border border-ca-border bg-black">
        {item.kind === "video" ? (
          <>
            <video
              ref={(el) => {
                mediaRef.current = el;
                setVideoEl(el);
              }}
              src={src}
              className={
                projection === "360"
                  ? "pointer-events-none absolute h-px w-px opacity-0"
                  : "mx-auto max-h-[60vh] w-full"
              }
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              playsInline
              crossOrigin="anonymous"
            />
            {projection === "360" && (
              <Video360 video={videoEl} className="aspect-video w-full" />
            )}
            <div className="absolute right-3 top-3 flex overflow-hidden rounded-full border border-white/20 bg-black/60 text-xs backdrop-blur">
              {(["flat", "360"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProjectionPersist(p)}
                  className={`px-3 py-1.5 font-semibold transition-colors ${
                    projection === p ? "bg-ca-gold text-ca-ink" : "text-white hover:bg-white/10"
                  }`}
                >
                  {p === "flat" ? "Flat" : "360°"}
                </button>
              ))}
            </div>
            {projection === "360" && (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70">
                Drag to look · scroll to zoom
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center bg-ca-panel p-10">
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={src}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <div className="text-center">
              <div className="font-display text-5xl text-ca-gold">♪</div>
              <div className="mt-2 font-mono text-2xl text-white">{fmtTime(current)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mt-4 select-none">
        <div
          ref={timelineRef}
          onClick={timelineSeek}
          className="relative h-14 cursor-pointer rounded-xl border border-ca-border bg-ca-panel"
        >
          {/* trimmed-out shading */}
          <div
            className="absolute inset-y-0 left-0 rounded-l-xl bg-black/60"
            style={{ width: `${pct(trimIn)}%` }}
          />
          {end > 0 && (
            <div
              className="absolute inset-y-0 right-0 rounded-r-xl bg-black/60"
              style={{ width: `${100 - pct(end)}%` }}
            />
          )}
          {/* markers: points are pins, sections are bands */}
          {markers.map((m) =>
            m.end != null ? (
              <button
                key={m.id}
                type="button"
                title={`${m.label}${m.author ? ` — ${m.author}` : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(m.t);
                }}
                className={`absolute top-0 h-full border-x ${
                  m.by === "client"
                    ? "border-sky-400/70 bg-sky-400/20 hover:bg-sky-400/30"
                    : "border-ca-gold/70 bg-ca-gold/20 hover:bg-ca-gold/30"
                }`}
                style={{ left: `${pct(m.t)}%`, width: `${Math.max(0.5, pct(m.end) - pct(m.t))}%` }}
              />
            ) : (
              <button
                key={m.id}
                type="button"
                title={`${m.label}${m.author ? ` — ${m.author}` : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(m.t);
                }}
                className={`absolute top-0 h-full w-[3px] -translate-x-1/2 ${
                  m.by === "client"
                    ? "bg-sky-400/80 hover:bg-sky-300"
                    : "bg-ca-gold/80 hover:bg-ca-gold-light"
                }`}
                style={{ left: `${pct(m.t)}%` }}
              />
            )
          )}
          {/* playhead */}
          <div
            className="pointer-events-none absolute top-0 h-full w-[2px] bg-white"
            style={{ left: `${pct(current)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-ca-muted">
          <span>{fmtTime(current)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ca-ink transition-colors hover:bg-ca-gold-light"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTrimIn(current);
            setDirty(true);
          }}
          className="rounded-full border border-ca-border px-4 py-2 text-sm text-white hover:border-ca-gold"
        >
          Set In · {fmtTime(trimIn)}
        </button>
        <button
          type="button"
          onClick={() => {
            setTrimOut(current);
            setDirty(true);
          }}
          className="rounded-full border border-ca-border px-4 py-2 text-sm text-white hover:border-ca-gold"
        >
          Set Out · {trimOut == null ? "end" : fmtTime(trimOut)}
        </button>
        <button
          type="button"
          onClick={() => {
            setTrimIn(0);
            setTrimOut(null);
            setDirty(true);
          }}
          className="rounded-full border border-ca-border px-4 py-2 text-sm text-ca-muted hover:text-white"
        >
          Clear trim
        </button>
        <button
          type="button"
          onClick={addMarker}
          className="rounded-full border border-ca-gold/50 px-4 py-2 text-sm text-ca-gold hover:bg-ca-gold/10"
        >
          + Marker
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-ca-muted">
          <input
            type="checkbox"
            checked={previewTrim}
            onChange={(e) => setPreviewTrim(e.target.checked)}
            className="accent-[#d4a853]"
          />
          Preview trimmed
        </label>
      </div>
      <p className="mt-2 text-xs text-ca-muted">
        Shortcuts: <span className="font-mono">space</span> play ·{" "}
        <span className="font-mono">I</span> set in · <span className="font-mono">O</span>{" "}
        set out · <span className="font-mono">M</span> marker. Edits are non-destructive —
        the master file is never modified.
      </p>

      {/* Marker list */}
      <div className="mt-8 rounded-2xl border border-ca-border bg-ca-panel p-6">
        <h2 className="font-display text-xl font-semibold text-white">Markers</h2>
        {markers.length === 0 ? (
          <p className="mt-3 text-sm text-ca-muted">
            No markers yet. Pause where something matters and hit{" "}
            <span className="font-mono">M</span>.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {markers.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => seek(m.t)}
                  className={`w-32 shrink-0 rounded-lg bg-ca-elevated px-2 py-1.5 text-left font-mono text-xs hover:bg-ca-gold/15 ${
                    m.by === "client" ? "text-sky-400" : "text-ca-gold"
                  }`}
                >
                  {m.end != null ? `${fmtTime(m.t)}–${fmtTime(m.end)}` : fmtTime(m.t)}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    value={m.label}
                    onChange={(e) => {
                      setMarkers((prev) =>
                        prev.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x))
                      );
                      setDirty(true);
                    }}
                    className="w-full rounded-lg border border-ca-border bg-ca-ink px-3 py-1.5 text-sm text-white focus:border-ca-gold"
                    aria-label="Marker label"
                  />
                  {m.note && <p className="mt-1 px-1 text-xs text-ca-muted">{m.note}</p>}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-ca-muted">
                  {m.by === "client" ? (m.author ?? "client") : "admin"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMarkers((prev) => prev.filter((x) => x.id !== m.id));
                    setDirty(true);
                  }}
                  className="text-xs text-ca-muted hover:text-red-400"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
