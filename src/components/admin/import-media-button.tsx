"use client";

import { useCallback, useRef, useState } from "react";
import { useCapability } from "@/components/capability-provider";
import { importMediaFiles } from "@/lib/import-media-client";
import type { MediaItem } from "@/lib/media-shared";

type AcceptMode = "any" | "video" | "audio";

type Props = {
  onImported?: (item: MediaItem) => void | Promise<void>;
  onBatchDone?: (items: MediaItem[]) => void | Promise<void>;
  accept?: AcceptMode;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  multiple?: boolean;
};

function acceptAttr(mode: AcceptMode, videoOn: boolean): string {
  if (mode === "video") return "video/*,.mov,.mp4,.m4v";
  if (mode === "audio") return "audio/*,.wav,.mp3,.m4a,.aac,.flac";
  return videoOn
    ? "video/*,audio/*,.mov,.mp4,.wav,.mp3,.m4a"
    : "audio/*,.wav,.mp3,.m4a,.aac,.flac";
}

/**
 * Import control — large files upload straight to Vercel Blob from the browser.
 */
export function ImportMediaButton({
  onImported,
  onBatchDone,
  accept = "any",
  label,
  size = "md",
  className = "",
  variant = "primary",
  multiple = true,
}: Props) {
  const { videoOn } = useCapability();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultLabel =
    accept === "video"
      ? "Import video"
      : accept === "audio"
        ? "Import audio"
        : videoOn
          ? "Import media"
          : "Import audio";

  const btnClass =
    variant === "primary"
      ? "ca-btn ca-btn-primary"
      : variant === "secondary"
        ? "ca-btn ca-btn-secondary"
        : "ca-btn ca-btn-ghost";

  const sizeClass =
    size === "sm" ? "ca-btn-sm" : size === "lg" ? "ca-btn-lg" : "";

  const runImport = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setError(null);
      setBusy(true);
      try {
        const { done, errors } = await importMediaFiles(list, {
          onProgress: setProgress,
          onItem: onImported,
        });
        if (errors.length) {
          setError(errors.join(" · "));
        }
        await onBatchDone?.(done);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      } finally {
        setProgress(null);
        setBusy(false);
      }
    },
    [onImported, onBatchDone],
  );

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={`${btnClass} ${sizeClass} disabled:opacity-50`}
      >
        <ImportIcon className="h-4 w-4" />
        {busy ? progress ?? "Importing…" : label ?? defaultLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr(accept, videoOn)}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void runImport(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="max-w-xs text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function ImportMediaPair({
  onImported,
  onBatchDone,
  className = "",
}: {
  onImported?: (item: MediaItem) => void | Promise<void>;
  onBatchDone?: (items: MediaItem[]) => void | Promise<void>;
  className?: string;
}) {
  const { videoOn } = useCapability();
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {videoOn && (
        <ImportMediaButton
          accept="video"
          label="Import video"
          onImported={onImported}
          onBatchDone={onBatchDone}
          variant="primary"
        />
      )}
      <ImportMediaButton
        accept="audio"
        label="Import audio"
        onImported={onImported}
        onBatchDone={onBatchDone}
        variant={videoOn ? "secondary" : "primary"}
      />
      {videoOn && (
        <ImportMediaButton
          accept="any"
          label="Import video or audio…"
          onImported={onImported}
          onBatchDone={onBatchDone}
          variant="ghost"
          size="sm"
        />
      )}
    </div>
  );
}

function ImportIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}
