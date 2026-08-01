"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCapability } from "@/components/capability-provider";
import { ImportMediaPair } from "@/components/admin/import-media-button";
import { importMediaFiles } from "@/lib/import-media-client";
import type { MediaItem } from "@/lib/media-shared";
import { formatBytes } from "@/lib/media-shared";

export function MediaLibrary() {
  const { videoOn } = useCapability();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropBusy, setDropBusy] = useState(false);
  const [dropProgress, setDropProgress] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    fetch("/api/admin/media")
      .then(async (res) => {
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
      })
      .catch((err) => {
        setItems([]);
        setError(
          err instanceof Error ? err.message : "Could not load media library",
        );
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Same plumbing as Import buttons — Blob client upload for large files. */
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setError(null);
      setDropBusy(true);
      setDropProgress(`Importing ${list.length} file${list.length === 1 ? "" : "s"}…`);
      try {
        const { done, errors } = await importMediaFiles(list, {
          onProgress: setDropProgress,
        });
        if (errors.length) {
          setError(errors.join(" · "));
        }
        if (done.length) {
          // Optimistic: prepend then full refresh
          setItems((prev) => {
            const next = prev ? [...done, ...prev] : done;
            // de-dupe by id
            const seen = new Set<string>();
            return next.filter((m) => {
              if (seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            });
          });
        }
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setDropBusy(false);
        setDropProgress(null);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      refresh();
    },
    [refresh],
  );

  return (
    <div className="mt-8 space-y-6">
      <div className="ca-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Import media</p>
          <p className="mt-1 text-xs leading-relaxed text-ca-muted">
            {videoOn
              ? "Each file is a feed — Cam A, Cam B, board mix, B-roll, song — like instruments in GarageBand. Drag-and-drop or use the buttons (same cloud path)."
              : "Each file is a feed/stem — import, then open Timeline to stack them in parallel."}
          </p>
        </div>
        <ImportMediaPair onBatchDone={() => refresh()} />
      </div>

      {/* Drop zone — same import plumbing as buttons */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (e.dataTransfer.files.length) {
            void uploadFiles(e.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dropBusy
            ? "border-ca-gold/50 bg-ca-gold/10"
            : dragOver
              ? "border-ca-gold bg-ca-gold/5"
              : "border-white/12 bg-ca-panel/50"
        }`}
      >
        {dropBusy ? (
          <>
            <p className="text-sm font-medium text-ca-gold">
              {dropProgress ?? "Importing…"}
            </p>
            <p className="mt-2 text-xs text-ca-muted">
              Keep this tab open — large masters upload directly to cloud storage.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-white">
              {dragOver ? "Drop to import" : "Or drag & drop files here"}
            </p>
            <p className="mt-1 text-xs text-ca-muted">
              {videoOn
                ? "MP4, MOV, WAV, MP3, AAC, M4A… · multiple files at once · same path as Import buttons"
                : "WAV, MP3, AAC, FLAC, M4A… · multiple files at once"}
            </p>
            {!videoOn && (
              <p className="mt-2 text-xs text-ca-gold/80">
                Studio is audio-only — switch to Audio + Video in Settings to
                import picture.
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {videoOn && (
        <div className="rounded-xl border border-ca-gold/20 bg-ca-gold/5 px-4 py-3 text-sm text-zinc-300">
          <span className="font-medium text-ca-gold">Two angles + board mix?</span>{" "}
          Import all three → open{" "}
          <Link href="/admin/edits" className="text-ca-gold underline">
            Timeline
          </Link>{" "}
          (each feed = one parallel track). Drag to sync, set Program camera. Or
          use{" "}
          <Link href="/admin/sync-editor" className="text-ca-gold underline">
            Multi-angle sync
          </Link>{" "}
          for offset nudges only.
        </div>
      )}

      {items === null ? (
        <p className="text-sm text-ca-muted">Loading library…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
          <p className="text-sm text-ca-muted">
            Library is empty. Import Cam A, Cam B, and your board mix to get
            started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      )}
    </div>
  );
}
