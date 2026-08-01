/**
 * Browser-side media import — shared by Import buttons and drag-and-drop.
 * Large files go browser → Vercel Blob (multipart); small/local use FormData API.
 */

import { upload } from "@vercel/blob/client";
import {
  kindFromFile,
  mimeFromFile,
  type MediaItem,
} from "@/lib/media-shared";

const CLIENT_UPLOAD_THRESHOLD = 3.5 * 1024 * 1024; // 3.5 MB

function randomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function shouldUseClientUpload(file: File): boolean {
  if (file.size > CLIENT_UPLOAD_THRESHOLD) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

/** Upload one file into the media library; returns the library item. */
export async function importOneMediaFile(
  file: File,
  onProgress?: (label: string) => void,
): Promise<MediaItem> {
  const kind = kindFromFile(file);
  if (!kind) {
    throw new Error(
      `Unsupported type: ${file.type || "unknown"} (${file.name})`,
    );
  }
  const mime = mimeFromFile(file);

  if (shouldUseClientUpload(file)) {
    const id = randomId();
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : kind === "video"
        ? ".mp4"
        : ".wav";
    const pathname = `ca/media/${id}/file${ext}`;

    onProgress?.(`Uploading ${file.name}…`);

    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/admin/media/blob-upload",
      multipart: file.size > CLIENT_UPLOAD_THRESHOLD,
    });

    onProgress?.(`Registering ${file.name}…`);

    const res = await fetch("/api/admin/media/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: file.name.replace(/\.[^.]+$/, ""),
        mime,
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

  onProgress?.(`Uploading ${file.name}…`);
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
}

/** Import many files in order. Continues after individual failures. */
export async function importMediaFiles(
  files: FileList | File[],
  opts?: {
    onProgress?: (label: string) => void;
    onItem?: (item: MediaItem) => void | Promise<void>;
  },
): Promise<{ done: MediaItem[]; errors: string[] }> {
  const list = Array.from(files);
  const done: MediaItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    const prefix =
      list.length > 1 ? `(${i + 1}/${list.length}) ` : "";
    try {
      opts?.onProgress?.(`${prefix}Importing ${file.name}…`);
      const item = await importOneMediaFile(file, opts?.onProgress);
      done.push(item);
      await opts?.onItem?.(item);
    } catch (err) {
      errors.push(
        `${file.name}: ${err instanceof Error ? err.message : "failed"}`,
      );
    }
  }

  opts?.onProgress?.(
    done.length
      ? `Imported ${done.length} file${done.length === 1 ? "" : "s"}`
      : "",
  );
  return { done, errors };
}
