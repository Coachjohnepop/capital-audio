"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useCapability } from "@/components/capability-provider";
import { kindFromMime, type MediaItem } from "@/lib/media-shared";

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

/** Above this, use browser → Vercel Blob direct upload (avoids HTTP 413). */
const CLIENT_UPLOAD_THRESHOLD = 3.5 * 1024 * 1024; // 3.5 MB

function acceptAttr(mode: AcceptMode, videoOn: boolean): string {
  if (mode === "video") return "video/*";
  if (mode === "audio") return "audio/*";
  return videoOn ? "video/*,audio/*" : "audio/*";
}

function randomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Import control — large files upload straight to Vercel Blob from the browser
 * (no serverless body limit). Small files / local dev use the API FormData path.
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

  const uploadOne = useCallback(async (file: File): Promise<MediaItem> => {
    const kind =
      kindFromMime(file.type) ??
      (file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
          ? "audio"
          : null);
    if (!kind) {
      throw new Error(`Unsupported type: ${file.type || file.name}`);
    }

    const useClientUpload =
      file.size > CLIENT_UPLOAD_THRESHOLD ||
      // Prefer client path on hosted deployments
      (typeof window !== "undefined" &&
        !window.location.hostname.includes("localhost"));

    if (useClientUpload) {
      const id = randomId();
      const ext =
        file.name.includes(".")
          ? file.name.slice(file.name.lastIndexOf("."))
          : kind === "video"
            ? ".mp4"
            : ".wav";
      const pathname = `ca/media/${id}/file${ext}`;

      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/media/blob-upload",
        multipart: file.size > CLIENT_UPLOAD_THRESHOLD,
      });

      const res = await fetch("/api/admin/media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: file.name.replace(/\.[^.]+$/, ""),
          mime: file.type || "application/octet-stream",
          size: file.size,
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          filename: `file${ext}`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Register failed (${res.status})`);
      }
      return body as MediaItem;
    }

    // Local / small files: classic FormData through the API
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/media", {
      method: "POST",
      body: form,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error ?? `Upload failed (${res.status})`);
    }
    return body as MediaItem;
  }, []);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setError(null);
      setBusy(true);
      const done: MediaItem[] = [];
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProgress(
          list.length > 1
            ? `Importing ${i + 1}/${list.length}: ${file.name}`
            : `Importing ${file.name}…`,
        );
        try {
          const item = await uploadOne(file);
          done.push(item);
          await onImported?.(item);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Import failed");
        }
      }
      setProgress(null);
      setBusy(false);
      await onBatchDone?.(done);
    },
    [onImported, onBatchDone, uploadOne],
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
          if (e.target.files?.length) void uploadFiles(e.target.files);
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
