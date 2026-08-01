"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCapability } from "@/components/capability-provider";
import { ImportMediaPair } from "@/components/admin/import-media-button";
import {
  filesFromDataTransfer,
  importMediaFiles,
} from "@/lib/import-media-client";
import { setMediaDragData } from "@/lib/media-dnd";
import { MediaCardPreview } from "@/components/admin/media-preview";
import type { MediaItem } from "@/lib/media-shared";
import { formatBytes } from "@/lib/media-shared";

/**
 * Import from Finder (drop anywhere on this page / zone / buttons)
 * + drag library clips out to Timeline.
 * Existing cloud files already have the right path — no re-upload needed.
 */
export function MediaLibrary() {
  const { videoOn } = useCapability();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dropBusy, setDropBusy] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<(files: File[]) => Promise<void>>(async () => {});

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
          "No files received. Drop onto the dashed box or use Import video / Import audio.",
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
        if (dropInputRef.current) dropInputRef.current.value = "";
      }
    },
    [refresh],
  );

  uploadRef.current = uploadFiles;

  // Full-page Finder import (capture phase) — works even over the card grid
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const types = Array.from(e.dataTransfer.types);
      // Don't steal drags of library cards (our custom mime)
      if (types.includes("application/x-capital-audio-media")) return;
      if (!types.includes("Files") && !types.includes("application/x-moz-file")) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    };

    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const types = Array.from(e.dataTransfer.types);
      if (types.includes("application/x-capital-audio-media")) return;
      if (!types.includes("Files") && !types.includes("application/x-moz-file")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = filesFromDataTransfer(e.dataTransfer);
      if (files.length) {
        void uploadRef.current(files);
      } else {
        setError(
          "Finder drop had no file data. Drop on the dashed box, or use Import video / Import audio.",
        );
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragOver(false);
    };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop, true);
    window.addEventListener("dragleave", onDragLeave);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop, true);
      window.removeEventListener("dragleave", onDragLeave);
    };
  }, []);

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
            Drop from Finder anywhere on this page, or use Import. Files already
            in the library are on the cloud path —{" "}
            <strong className="text-zinc-300">no re-upload needed</strong>.
            Drag a card to Timeline to add it as a feed.
          </p>
        </div>
        <ImportMediaPair onBatchDone={() => void refresh()} />
      </div>

      <label
        className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dropBusy
            ? "border-ca-gold bg-ca-gold/10"
            : dragOver
              ? "border-ca-gold bg-ca-gold/10 ring-2 ring-ca-gold/40"
              : "border-white/12 bg-ca-panel/50 hover:border-white/25"
        }`}
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
        />
        {dropBusy ? (
          <>
            <p className="text-base font-medium text-ca-gold">
              {status ?? "Importing…"}
            </p>
            <p className="mt-2 text-xs text-ca-muted">
              Keep this tab open while cloud upload finishes.
            </p>
          </>
        ) : dragOver ? (
          <p className="text-lg font-semibold text-ca-gold">Drop to import</p>
        ) : (
          <>
            <p className="text-sm text-white">
              Drop from Finder here — or click to browse
            </p>
            <p className="mt-2 max-w-lg text-xs text-ca-muted">
              You can also drop anywhere on this Media page. Import buttons stay
              the most reliable for multi‑GB masters.
            </p>
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

      <div className="rounded-xl border border-ca-gold/20 bg-ca-gold/5 px-4 py-3 text-sm text-zinc-300">
        <span className="font-medium text-ca-gold">Use library files:</span>{" "}
        drag a card onto{" "}
        <Link href="/admin/edits" className="text-ca-gold underline">
          Timeline
        </Link>{" "}
        (or open Timeline and use “+ Add to timeline”). No re-import required.
      </div>

      {items === null ? (
        <p className="text-sm text-ca-muted">Loading library…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
          <p className="text-sm text-ca-muted">Library is empty.</p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
            {items.length} file{items.length === 1 ? "" : "s"} in library
            <span className="ml-2 normal-case tracking-normal text-zinc-600">
              — play inline · drag card to Timeline · click title for editor
            </span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((m) => (
              <article
                key={m.id}
                draggable
                onDragStart={(e) => {
                  setMediaDragData(e.dataTransfer, {
                    mediaId: m.id,
                    kind: m.kind,
                    title: m.title,
                  });
                  e.dataTransfer.setDragImage(
                    e.currentTarget,
                    40,
                    40,
                  );
                }}
                className="ca-card ca-card-hover group cursor-grab overflow-hidden p-0 active:cursor-grabbing"
                title="Drag to Timeline to add as a feed"
              >
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
                      {" · "}
                      {new Date(m.uploadedAt).toLocaleString()}
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Drag to Timeline · click for editor
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
