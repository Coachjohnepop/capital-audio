"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/media-shared";
import { Video360 } from "@/components/video-360";

function fmtTime(t: number) {
  if (!isFinite(t)) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const mmss = `${m}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : mmss;
}

export function ReviewPlayer({ id }: { id: string }) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [missing, setMissing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // Comment composer state
  const [sectionStart, setSectionStart] = useState<number | null>(null);
  const [composerAt, setComposerAt] = useState<{ t: number; end?: number } | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [author, setAuthor] = useState("");
  const [posting, setPosting] = useState(false);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/review/${id}`).then(async (res) => {
      setAuthor(localStorage.getItem("ca-review-name") ?? "");
      if (!res.ok) return setMissing(true);
      const m: MediaItem = await res.json();
      setItem(m);
      if (m.duration) setDuration(m.duration);
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
    if (el.paused) el.play();
    else el.pause();
  }, []);

  const openComposer = useCallback(
    (end?: number) => {
      const t = sectionStart ?? current;
      setComposerAt(end != null ? { t, end } : { t });
      setLabel("");
      setNote("");
    },
    [current, sectionStart]
  );

  const submit = useCallback(async () => {
    if (!composerAt || !label.trim()) return;
    setPosting(true);
    if (author.trim()) localStorage.setItem("ca-review-name", author.trim());
    const res = await fetch(`/api/review/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        t: composerAt.t,
        end: composerAt.end,
        label: label.trim(),
        note: note.trim() || undefined,
        author: author.trim() || undefined,
      }),
    });
    if (res.ok) setItem(await res.json());
    setPosting(false);
    setComposerAt(null);
    setSectionStart(null);
  }, [author, composerAt, id, label, note]);

  if (missing) {
    return (
      <p className="text-ca-muted">
        This review link isn&apos;t valid anymore — reach out to your Capital Audio contact.
      </p>
    );
  }
  if (!item) return <p className="text-sm text-ca-muted">Loading…</p>;

  const src = `/api/review/${id}/file`;
  const markers = item.edit.markers;
  const pct = (t: number) => (duration > 0 ? Math.min(100, (t / duration) * 100) : 0);
  const is360 = item.kind === "video" && item.projection === "360";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">{item.title}</h1>
        <p className="mt-1 text-sm text-ca-muted">
          Watch, then mark anything you want changed — every note lands with the editing
          team{is360 ? " · 360° — drag the video to look around" : ""}.
        </p>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-ca-border bg-black">
          {item.kind === "video" ? (
            <>
              <video
                ref={(el) => {
                  mediaRef.current = el;
                  setVideoEl(el);
                }}
                src={src}
                className={
                  is360
                    ? "pointer-events-none absolute h-px w-px opacity-0"
                    : "mx-auto max-h-[55vh] w-full"
                }
                onTimeUpdate={() => setCurrent(mediaRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => {
                  const d = mediaRef.current?.duration;
                  if (d && isFinite(d)) setDuration(d);
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                playsInline
                crossOrigin="anonymous"
              />
              {is360 && <Video360 video={videoEl} className="aspect-video w-full" />}
            </>
          ) : (
            <div className="flex items-center justify-center bg-ca-panel p-10">
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={src}
                onTimeUpdate={() => setCurrent(mediaRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => {
                  const d = mediaRef.current?.duration;
                  if (d && isFinite(d)) setDuration(d);
                }}
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
        <div
          ref={timelineRef}
          onClick={(e) => {
            const rect = timelineRef.current?.getBoundingClientRect();
            if (!rect || duration === 0) return;
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}
          className="relative mt-4 h-12 cursor-pointer select-none rounded-xl border border-ca-border bg-ca-panel"
        >
          {sectionStart != null && (
            <div
              className="absolute inset-y-0 border-x border-sky-400/70 bg-sky-400/20"
              style={{
                left: `${pct(Math.min(sectionStart, current))}%`,
                width: `${Math.abs(pct(current) - pct(sectionStart))}%`,
              }}
            />
          )}
          {markers.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.label}
              onClick={(e) => {
                e.stopPropagation();
                seek(m.t);
              }}
              className={
                m.end != null
                  ? `absolute top-0 h-full border-x ${
                      m.by === "client"
                        ? "border-sky-400/70 bg-sky-400/15"
                        : "border-ca-gold/70 bg-ca-gold/15"
                    }`
                  : `absolute top-0 h-full w-[3px] -translate-x-1/2 ${
                      m.by === "client" ? "bg-sky-400/80" : "bg-ca-gold/80"
                    }`
              }
              style={
                m.end != null
                  ? {
                      left: `${pct(m.t)}%`,
                      width: `${Math.max(0.5, pct(m.end) - pct(m.t))}%`,
                    }
                  : { left: `${pct(m.t)}%` }
              }
            />
          ))}
          <div
            className="pointer-events-none absolute top-0 h-full w-[2px] bg-white"
            style={{ left: `${pct(current)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-ca-muted">
          <span>{fmtTime(current)}</span>
          <span>{fmtTime(duration)}</span>
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
            onClick={() => openComposer()}
            className="rounded-full border border-ca-gold/50 px-4 py-2 text-sm text-ca-gold hover:bg-ca-gold/10"
          >
            + Note at {fmtTime(current)}
          </button>
          {sectionStart == null ? (
            <button
              type="button"
              onClick={() => setSectionStart(current)}
              className="rounded-full border border-sky-400/50 px-4 py-2 text-sm text-sky-400 hover:bg-sky-400/10"
            >
              Start section here
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (current > sectionStart) openComposer(current);
                }}
                className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-ca-ink hover:bg-sky-300"
              >
                End section at {fmtTime(current)}
              </button>
              <button
                type="button"
                onClick={() => setSectionStart(null)}
                className="rounded-full border border-ca-border px-4 py-2 text-sm text-ca-muted hover:text-white"
              >
                Cancel section
              </button>
            </>
          )}
        </div>

        {/* Composer */}
        {composerAt && (
          <div className="mt-4 rounded-2xl border border-ca-gold/40 bg-ca-panel p-5">
            <div className="font-mono text-xs text-ca-gold">
              {composerAt.end != null
                ? `Section ${fmtTime(composerAt.t)} – ${fmtTime(composerAt.end)}`
                : `At ${fmtTime(composerAt.t)}`}
            </div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Summary (e.g. 'Guitar too low here')"
              className="mt-3 w-full rounded-lg border border-ca-border bg-ca-ink px-3 py-2 text-sm text-white focus:border-ca-gold"
              autoFocus
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="More detail (optional)"
              rows={2}
              className="mt-2 w-full rounded-lg border border-ca-border bg-ca-ink px-3 py-2 text-sm text-white focus:border-ca-gold"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="w-40 rounded-lg border border-ca-border bg-ca-ink px-3 py-2 text-sm text-white focus:border-ca-gold"
              />
              <button
                type="button"
                onClick={submit}
                disabled={posting || !label.trim()}
                className="rounded-full bg-ca-gold px-5 py-2 text-sm font-semibold text-ca-ink transition-colors hover:bg-ca-gold-light disabled:opacity-40"
              >
                {posting ? "Posting…" : "Post note"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposerAt(null);
                  setSectionStart(null);
                }}
                className="rounded-full border border-ca-border px-4 py-2 text-sm text-ca-muted hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comment sidebar */}
      <aside className="rounded-2xl border border-ca-border bg-ca-panel p-5 lg:max-h-[80vh] lg:overflow-y-auto">
        <h2 className="font-display text-lg font-semibold text-white">
          Notes ({markers.length})
        </h2>
        {markers.length === 0 ? (
          <p className="mt-3 text-sm text-ca-muted">
            No notes yet. Play the video and add the first one.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {markers.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => seek(m.t)}
                  className="w-full rounded-xl border border-ca-border bg-ca-ink p-3 text-left transition-colors hover:border-ca-gold/50"
                >
                  <div
                    className={`font-mono text-xs ${
                      m.by === "client" ? "text-sky-400" : "text-ca-gold"
                    }`}
                  >
                    {m.end != null ? `${fmtTime(m.t)} – ${fmtTime(m.end)}` : fmtTime(m.t)}
                  </div>
                  <div className="mt-1 text-sm text-white">{m.label}</div>
                  {m.note && <div className="mt-1 text-xs text-ca-muted">{m.note}</div>}
                  <div className="mt-1.5 text-[10px] uppercase tracking-widest text-ca-muted">
                    {m.by === "client" ? (m.author ?? "client") : "Capital Audio"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
