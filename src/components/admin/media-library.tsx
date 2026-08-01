"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
      setError(null);
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

  // Prevent the browser from opening the file when dropped outside the zone
  useEffect(() => {
    const block = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  const uploadFiles = useCallback(
    async (raw: FileList | File[]) => {
      const list = Array.from(raw).filter((f) => f && f.size > 0);
      if (!list.length) {
        setError(
          "No files in that drop. Try the Import video / Import audio buttons, or drag from Finder again.",
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
        if (errors.length) {
          setError(errors.join(" · "));
        }
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
        // keep status briefly
        setTimeout(() => setStatus(null), 4000);
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

  return (
    <div
      className="space-y-6"
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        // only clear when leaving the whole panel
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const files = filesFromDataTransfer(e.dataTransfer);
        void uploadFiles(files);
      }}
    >
      <div className="ca-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Import media</p>
          <p className="mt-1 text-xs leading-relaxed text-ca-muted">
            Drag files anywhere on this page, or use the buttons. Large masters
            upload straight to cloud storage — keep the tab open until progress
            finishes.
          </p>
        </div>
        <ImportMediaPair
          onBatchDone={() => {
            void refresh();
          }}
        />
      </div>

      {/* Status / drop surface */}
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dropBusy
            ? "border-ca-gold bg-ca-gold/10"
            : dragOver
              ? "border-ca-gold bg-ca-gold/10 ring-2 ring-ca-gold/30"
              : "border-white/12 bg-ca-panel/50"
        }`}
      >
        {dropBusy ? (
          <>
            <p className="text-base font-medium text-ca-gold">
              {status ?? "Importing…"}
            </p>
            <p className="mt-2 max-w-md text-xs text-ca-muted">
              Uploading to Vercel Blob. Do not close this tab. Multi-GB files can
              take several minutes.
            </p>
          </>
        ) : dragOver ? (
          <p className="text-lg font-medium text-ca-gold">
            Drop video or audio to import
          </p>
        ) : (
          <>
            <p className="text-sm text-white">
              Drag & drop video or audio anywhere here
            </p>
            <p className="mt-1 text-xs text-ca-muted">
              {videoOn
                ? "MP4, MOV, WAV, MP3, M4A, AAC… · multiple files · same path as Import buttons"
                : "WAV, MP3, M4A, AAC… · multiple files"}
            </p>
            {!videoOn && (
              <p className="mt-2 text-xs text-ca-gold/80">
                Studio is audio-only — switch to{" "}
                <strong className="text-ca-gold">A + V</strong> (top right) to
                import video.
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
          <span className="font-medium text-ca-gold">Tip:</span> After import,
          open{" "}
          <Link href="/admin/edits" className="text-ca-gold underline">
            Timeline
          </Link>{" "}
          and import feeds as parallel tracks — or use{" "}
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
            Library is empty. Drop files above or use Import video / Import
            audio.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
            {items.length} file{items.length === 1 ? "" : "s"} in library
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
                  <div className="mt-3 text-xs text-ca-muted">
                    {m.edit.markers.length} marker
                    {m.edit.markers.length === 1 ? "" : "s"}
                    {m.edit.trimIn > 0 || m.edit.trimOut != null
                      ? " · trimmed"
                      : ""}
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
