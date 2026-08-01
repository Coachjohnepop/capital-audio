"use client";

import { mediaPlayUrl, type MediaItem } from "@/lib/media-shared";

/**
 * Inline preview for library cards — shows the actual video frame or audio chrome.
 */
export function MediaCardPreview({ item }: { item: MediaItem }) {
  const src = mediaPlayUrl(item);

  if (item.kind === "video") {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          src={src}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          // No crossOrigin — Blob CDN + anonymous CORS was blanking the player
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
          Video
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-ca-elevated to-ca-ink">
      <span className="font-display text-4xl text-ca-gold">♪</span>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-ca-muted">
        Audio
      </span>
      {/* Hidden audio so duration can load later if needed */}
      <audio src={src} preload="metadata" className="hidden" />
    </div>
  );
}

/** Full player for the media editor. */
export function MediaPlayer({
  item,
  mediaRef,
  onTimeUpdate,
  onLoadedMetadata,
  onPlay,
  onPause,
  className = "",
}: {
  item: MediaItem;
  mediaRef: React.RefCallback<HTMLVideoElement | HTMLAudioElement | null> | React.RefObject<HTMLVideoElement | HTMLAudioElement | null>;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
}) {
  const src = mediaPlayUrl(item);

  if (item.kind === "video") {
    return (
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        src={src}
        className={className || "mx-auto max-h-[70vh] w-full bg-black"}
        controls
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={onPlay}
        onPause={onPause}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 bg-ca-panel px-6 py-16">
      <div className="font-display text-6xl text-ca-gold">♪</div>
      <p className="max-w-md truncate text-center text-sm text-ca-muted">
        {item.title}
      </p>
      <audio
        ref={mediaRef as React.RefObject<HTMLAudioElement>}
        src={src}
        controls
        preload="auto"
        className="w-full max-w-xl"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={onPlay}
        onPause={onPause}
      />
    </div>
  );
}
