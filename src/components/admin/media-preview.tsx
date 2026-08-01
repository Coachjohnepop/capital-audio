"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaPlayUrl, type MediaItem } from "@/lib/media-shared";

function fmtTime(t: number) {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Finder-style library card preview:
 * - Video: still frame + play overlay
 * - Audio: big play/pause like Quick Look / Finder column preview
 */
export function MediaCardPreview({ item }: { item: MediaItem }) {
  const src = mediaPlayUrl(item);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(item.duration ?? 0);
  const [error, setError] = useState(false);

  // Stop when another card starts (listen for custom event)
  useEffect(() => {
    const stop = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id !== item.id) {
        audioRef.current?.pause();
        videoRef.current?.pause();
        setPlaying(false);
      }
    };
    window.addEventListener("ca-media-preview-play", stop);
    return () => window.removeEventListener("ca-media-preview-play", stop);
  }, [item.id]);

  const announcePlay = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("ca-media-preview-play", { detail: item.id }),
    );
  }, [item.id]);

  const toggleAudio = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = audioRef.current;
      if (!el) return;
      if (el.paused) {
        announcePlay();
        void el.play().then(() => setPlaying(true)).catch(() => setError(true));
      } else {
        el.pause();
        setPlaying(false);
      }
    },
    [announcePlay],
  );

  const toggleVideo = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = videoRef.current;
      if (!el) return;
      if (el.paused) {
        announcePlay();
        el.muted = false;
        void el.play().then(() => setPlaying(true)).catch(() => setError(true));
      } else {
        el.pause();
        setPlaying(false);
      }
    },
    [announcePlay],
  );

  const seekAudio = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    el.currentTime = Math.max(0, Math.min(duration, t));
    setCurrent(el.currentTime);
  }, [duration]);

  if (item.kind === "video") {
    return (
      <div className="group/preview relative aspect-video w-full overflow-hidden rounded-t-xl bg-black">
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-cover"
          playsInline
          preload="metadata"
          onTimeUpdate={() => {
            if (videoRef.current) setCurrent(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current && isFinite(videoRef.current.duration)) {
              setDuration(videoRef.current.duration);
            }
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setError(true)}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Play / pause — Finder-style center control */}
        <button
          type="button"
          onClick={toggleVideo}
          className="absolute inset-0 flex items-center justify-center"
          aria-label={playing ? "Pause video" : "Play video"}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition-opacity ${
              playing ? "opacity-0 group-hover/preview:opacity-100" : "opacity-100"
            }`}
          >
            {playing ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5 translate-x-0.5" />
            )}
          </span>
        </button>

        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
            Video
          </span>
          {duration > 0 && (
            <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/90">
              {fmtTime(current)} / {fmtTime(duration)}
            </span>
          )}
        </div>
        {error && (
          <span className="absolute left-2 top-2 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white">
            Preview unavailable
          </span>
        )}
      </div>
    );
  }

  // —— Audio: Finder-like listen control ——
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-t-xl border-b border-white/5 bg-gradient-to-br from-ca-elevated via-ca-panel to-ca-ink p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) setCurrent(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onError={() => setError(true)}
      />

      <div className="flex items-start justify-between">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ca-muted">
          Audio
        </span>
        {duration > 0 && (
          <span className="font-mono text-[11px] text-zinc-400">
            {fmtTime(current)} / {fmtTime(duration)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        {/* Decorative waveform bars (static, Finder vibe) */}
        <div className="flex h-8 items-end gap-0.5 opacity-40" aria-hidden>
          {[3, 7, 5, 10, 6, 12, 8, 4, 9, 5, 11, 6, 3, 8, 5].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-sm bg-ca-gold ${playing ? "animate-pulse" : ""}`}
              style={{ height: `${h * 2}px`, animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={toggleAudio}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ca-gold text-ca-ink shadow-lg shadow-ca-gold/20 transition-transform hover:scale-105 active:scale-95"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <PauseIcon className="h-6 w-6" />
          ) : (
            <PlayIcon className="h-6 w-6 translate-x-0.5" />
          )}
        </button>
        <p className="text-[11px] text-ca-muted">
          {error ? "Can’t preview" : playing ? "Playing…" : "Click to listen"}
        </p>
      </div>

      {/* Scrub bar — like Finder preview scrub */}
      <div
        role="slider"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        tabIndex={0}
        onClick={seekAudio}
        className="mt-1 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-ca-gold transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlayIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5L8 5.5z" />
    </svg>
  );
}

function PauseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  );
}
