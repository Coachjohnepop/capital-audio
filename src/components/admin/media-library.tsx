"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCapability } from "@/components/capability-provider";
import { ImportMediaPair } from "@/components/admin/import-media-button";
import { importMediaFiles } from "@/lib/import-media-client";
import { MediaCardPreview } from "@/components/admin/media-preview";
import type { MediaItem } from "@/lib/media-shared";
import { formatBytes } from "@/lib/media-shared";

/**
 * Drop zone uses a real &lt;input type="file"&gt; overlay.
 * On macOS, Finder drops onto a file input are far more reliable than
 * parsing dataTransfer in JS (which often yields an empty FileList).
 */
export function MediaLibrary() {
  const { videoOn } = useCapability();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dropBusy, setDropBusy] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          body?.error || `Could not load media library (${res.status})`,
        );
      }
      if (!Array.isArray(body)) {
        throw new Error("Unexpected media library response");
      }
      setItems(body);
    } catch (err) {
      setItems((prev) => prev ?? []);
      setError(
        err instanceof Error ? err.message : "Could not load media library",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uploadFiles = useCallback(
    async (list: File[]) => {
      if (!list.length) {
        setError(
          "No files received. Use Import video / Import audio, or drop onto the dashed box (not the browser chrome).",
        );
        return;
      }

      setError(null);
      setStatus(null);
      setDropBusy(true);
      try {
        const { done, errors } = await importMediaFiles(list, {
          onProgress: setStatus,
        });
        if (errors.length) setError(errors.join(" · "));
        if (done.length) {
          setStatus(
            `Imported ${done.length} file${done.length === 1 ? "" : "s"}`,
          );
          setItems((prev) => {
            const merged = [...done, ...(prev ?? [])];
            const seen = new Set<string>();
            return merged.filter((m) => {
              if (seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            });
          });
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setDropBusy(false);
        setTimeout(() => setStatus(null), 5000);
        // reset input so the same file can be dropped again
        if (dropInputRef.current) dropInputRef.current.value = "";
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const accept = videoOn
    ? "video/*,audio/*,.mov,.mp4,.m4v,.wav,.mp3,.m4a,.aac,.flac"
    : "audio/*,.wav,.mp3,.m4a,.aac,.flac";

  return (
    <div className="space-y-6">
      <div className="ca-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Import media</p>
          <p className="mt-1 text-xs leading-relaxed text-ca-muted">
            Use the buttons or drop onto the zone below. Audio cards have a{" "}
            <span className="text-ca-gold">play</span> control so you can listen
            like in Finder.
          </p>
        </div>
        <ImportMediaPair onBatchDone={() => void refresh()} />
      </div>

      {/*
        Native file input covers the drop zone.
        Finder → drop on input fires onChange with a real FileList (macOS-friendly).
      */}
      <label
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dropBusy
            ? "border-ca-gold bg-ca-gold/10"
            : dragOver
              ? "border-ca-gold bg-ca-gold/10 ring-2 ring-ca-gold/40"
              : "border-white/12 bg-ca-panel/50 hover:border-white/25"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          // Backup path if the input doesn't receive the drop
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const files = e.dataTransfer?.files
            ? Array.from(e.dataTransfer.files)
            : [];
          if (files.length) void uploadFiles(files);
        }}
      >
        <input
          ref={dropInputRef}
          type="file"
          accept={accept}
          multiple
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          disabled={dropBusy}
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length) void uploadFiles(files);
          }}
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
        />

        {dropBusy ? (
          <>
            <p className="relative z-0 text-base font-medium text-ca-gold">
              {status ?? "Importing…"}
            </p>
            <p className="relative z-0 mt-2 max-w-lg text-xs text-ca-muted">
              Uploading to cloud storage. Keep this tab open.
            </p>
          </>
        ) : dragOver ? (
          <p className="relative z-0 text-lg font-semibold text-ca-gold">
            Drop to import
          </p>
        ) : (
          <>
            <p className="relative z-0 text-sm text-white">
              Drop files here — or click to browse
            </p>
            <p className="relative z-0 mt-2 max-w-lg text-xs leading-relaxed text-ca-muted">
              Finder drag works on this box (native file drop). You can also
              click it like a folder, or use{" "}
              <span className="text-zinc-300">Import video / audio</span> above.
            </p>
            <p className="relative z-0 mt-3 text-[11px] text-zinc-600">
              {videoOn
                ? "MP4 · MOV · WAV · MP3 · M4A · AAC"
                : "WAV · MP3 · M4A · AAC · FLAC"}
            </p>
            {!videoOn && (
              <p className="relative z-0 mt-2 text-xs text-ca-gold/80">
                Switch top-right to <strong>A + V</strong> to import video.
              </p>
            )}
          </>
        )}
      </label>

      {status && !dropBusy && (
        <p className="rounded-lg border border-ca-gold/25 bg-ca-gold/10 px-4 py-2 text-sm text-ca-gold">
          {status}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {videoOn && (
        <div className="rounded-xl border border-ca-gold/20 bg-ca-gold/5 px-4 py-3 text-sm text-zinc-300">
          <span className="font-medium text-ca-gold">Next:</span> open{" "}
          <Link href="/admin/edits" className="text-ca-gold underline">
            Timeline
          </Link>{" "}
          to stack feeds, or{" "}
          <Link href="/admin/sync-editor" className="text-ca-gold underline">
            Sync
          </Link>{" "}
          for multi-cam offsets.
        </div>
      )}

      {items === null ? (
        <p className="text-sm text-ca-muted">Loading library…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
          <p className="text-sm text-ca-muted">
            Library is empty. Drop files on the box above or use Import.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
            {items.length} file{items.length === 1 ? "" : "s"} in library
            <span className="ml-2 normal-case tracking-normal text-zinc-600">
              — play audio inline · click card body for full editor
            </span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((m) => (
              <article
                key={m.id}
                className="ca-card ca-card-hover group overflow-hidden p-0"
              >
                {/* Preview is outside the main link so play buttons work */}
                <MediaCardPreview item={m} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                        m.kind === "video"
                          ? "bg-ca-gold/15 text-ca-gold"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {m.kind}
                    </span>
                    <button
                      type="button"
                      onClick={() => void remove(m.id)}
                      className="text-xs text-ca-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      aria-label={`Delete ${m.title}`}
                    >
                      Delete
                    </button>
                  </div>
                  <Link href={`/admin/media/${m.id}`} className="mt-2 block">
                    <div className="truncate font-medium text-white transition-colors hover:text-ca-gold">
                      {m.title}
                    </div>
                    <div className="mt-1 text-xs text-ca-muted">
                      {formatBytes(m.size)}
                      {m.duration
                        ? ` · ${Math.floor(m.duration / 60)}:${String(
                            Math.floor(m.duration % 60),
                          ).padStart(2, "0")}`
                        : ""}
                      {" · "}
                      {new Date(m.uploadedAt).toLocaleString()}
                    </div>
                    <p className="mt-2 text-[11px] text-ca-gold/80">
                      Open editor →
                    </p>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
