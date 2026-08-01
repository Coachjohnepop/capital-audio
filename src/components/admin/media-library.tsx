"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCapability } from "@/components/capability-provider";
import { ImportMediaPair } from "@/components/admin/import-media-button";
import {
  filesFromDataTransfer,
  importMediaFiles,
} from "@/lib/import-media-client";
import type { MediaItem } from "@/lib/media-shared";
import { formatBytes } from "@/lib/media-shared";

export function MediaLibrary() {
  const { videoOn } = useCapability();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dropBusy, setDropBusy] = useState(false);
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
          "Drop didn’t include a readable file. From Finder, drag the file icon (not a preview). Or click Import video / Import audio — those always work.",
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
      }
    },
    [refresh],
  );

  uploadRef.current = uploadFiles;

  /**
   * Single window-level drop pipeline so Finder drops always hit our handler
   * (and the browser doesn’t “open” the file instead).
   */
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      // Only highlight when dragging files
      if (e.dataTransfer?.types) {
        const types = Array.from(e.dataTransfer.types);
        if (types.includes("Files") || types.includes("application/x-moz-file")) {
          setDragOver(true);
        }
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragOver(false);
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      // Snapshot files NOW — dataTransfer is invalid after this handler returns
      const files = filesFromDataTransfer(e.dataTransfer);
      if (files.length === 0) {
        const types = e.dataTransfer
          ? Array.from(e.dataTransfer.types || [])
          : [];
        // Ignore non-file drops (e.g. dragging text/links inside the page)
        if (
          !types.includes("Files") &&
          !types.includes("application/x-moz-file")
        ) {
          return;
        }
        setError(
          "Finder drop had no file data. Tips: (1) drag the file from a normal Finder window, not Photos/Music, (2) if it’s in iCloud, wait until fully downloaded, (3) or click Import video / Import audio.",
        );
        return;
      }

      void uploadRef.current(files);
    };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop, true); // capture so we always get it
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop, true);
    };
  }, []);

  const remove = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  return (
    <div className="space-y-6">
      <div className="ca-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Import media</p>
          <p className="mt-1 text-xs leading-relaxed text-ca-muted">
            <strong className="text-zinc-300">Yes — drag from Finder</strong>{" "}
            onto this page, or use the buttons. Buttons are the most reliable
            for multi‑GB masters. Keep the tab open until progress finishes.
          </p>
        </div>
        <ImportMediaPair onBatchDone={() => void refresh()} />
      </div>

      <div
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dropBusy
            ? "border-ca-gold bg-ca-gold/10"
            : dragOver
              ? "border-ca-gold bg-ca-gold/10 ring-2 ring-ca-gold/40"
              : "border-white/12 bg-ca-panel/50"
        }`}
      >
        {dropBusy ? (
          <>
            <p className="text-base font-medium text-ca-gold">
              {status ?? "Importing…"}
            </p>
            <p className="mt-2 max-w-lg text-xs text-ca-muted">
              Uploading to cloud storage. Do not close this tab.
            </p>
          </>
        ) : dragOver ? (
          <>
            <p className="text-lg font-semibold text-ca-gold">
              Drop to import into the library
            </p>
            <p className="mt-1 text-xs text-ca-muted">
              Release the mouse — upload starts immediately
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-white">
              Drag from <span className="text-ca-gold">Finder</span> onto this
              page
            </p>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-ca-muted">
              Open a Finder window → grab the file icon → drop here (or anywhere
              on Media). Works for video and audio. If drag misbehaves, use{" "}
              <span className="text-zinc-300">Import video</span> /{" "}
              <span className="text-zinc-300">Import audio</span> instead.
            </p>
            <p className="mt-3 text-[11px] text-zinc-600">
              {videoOn
                ? "MP4 · MOV · WAV · MP3 · M4A · AAC"
                : "WAV · MP3 · M4A · AAC · FLAC"}
            </p>
            {!videoOn && (
              <p className="mt-2 text-xs text-ca-gold/80">
                Switch top-right to <strong>A + V</strong> to import video.
              </p>
            )}
          </>
        )}
      </div>

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
            Library is empty. Import video and audio to get started.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
            {items.length} file{items.length === 1 ? "" : "s"} in library
            <span className="ml-2 normal-case tracking-normal text-zinc-600">
              (already in cloud — safe across logins)
            </span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((m) => (
              <div key={m.id} className="ca-card ca-card-hover group p-5">
                <div className="flex items-start justify-between gap-3">
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
                <Link href={`/admin/media/${m.id}`} className="mt-3 block">
                  <div className="truncate font-medium text-white transition-colors group-hover:text-ca-gold">
                    {m.title}
                  </div>
                  <div className="mt-1 text-xs text-ca-muted">
                    {formatBytes(m.size)} ·{" "}
                    {new Date(m.uploadedAt).toLocaleString()}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
