"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/media-shared";
import { formatBytes } from "@/lib/media-shared";

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    fetch("/api/admin/media")
      .then((res) => res.json())
      .then(setItems);
  }, []);

  useEffect(() => {
    fetch("/api/admin/media")
      .then((res) => res.json())
      .then(setItems);
  }, []);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      for (const file of Array.from(files)) {
        setUploading(file.name);
        const form = new FormData();
        form.append("file", file);
        try {
          const res = await fetch("/api/admin/media", { method: "POST", body: form });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error ?? `Upload failed (${res.status})`);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed");
        }
      }
      setUploading(null);
      refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      refresh();
    },
    [refresh]
  );

  return (
    <div className="mt-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-ca-gold bg-ca-gold/5" : "border-ca-border bg-ca-panel"
        }`}
      >
        <p className="text-sm text-white">
          {uploading ? `Uploading ${uploading}…` : "Drag & drop video or audio files"}
        </p>
        <p className="mt-1 text-xs text-ca-muted">MP4, MOV, WAV, MP3, AAC…</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!!uploading}
          className="mt-4 rounded-full bg-ca-gold px-5 py-2 text-sm font-semibold text-ca-ink transition-colors hover:bg-ca-gold-light disabled:opacity-50"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="mt-8 text-sm text-ca-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-ca-muted">No media yet.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <div
              key={m.id}
              className="group rounded-2xl border border-ca-border bg-ca-panel p-5 transition-colors hover:border-ca-gold/40"
            >
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
                  onClick={() => remove(m.id)}
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
                  {formatBytes(m.size)} · {new Date(m.uploadedAt).toLocaleString()}
                </div>
                <div className="mt-3 text-xs text-ca-muted">
                  {m.edit.markers.length} marker{m.edit.markers.length === 1 ? "" : "s"}
                  {m.edit.trimIn > 0 || m.edit.trimOut != null ? " · trimmed" : ""}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
