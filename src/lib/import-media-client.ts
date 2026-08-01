/**
 * Browser-side media import — shared by Import buttons and drag-and-drop.
 * Hosted deploys always use direct Vercel Blob upload (avoids HTTP 413).
 */

import { upload } from "@vercel/blob/client";
import {
  kindFromFile,
  mimeFromFile,
  type MediaItem,
} from "@/lib/media-shared";

function randomId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function isHosted(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

/**
 * Snapshot files from a drop event IMMEDIATELY (sync).
 * dataTransfer is only valid during the drop handler.
 */
export function filesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];

  const out: File[] = [];
  const seen = new Set<string>();

  const push = (f: File | null) => {
    if (!f) return;
    // Key by name+size+lastModified to de-dupe files vs items
    const key = `${f.name}:${f.size}:${f.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };

  // Prefer items first (more reliable on some Chromium + macOS combos)
  if (dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === "file") {
        push(item.getAsFile());
      }
    }
  }

  if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) {
      push(dt.files[i]);
    }
  }

  return out;
}

/** Upload one file into the media library. */
export async function importOneMediaFile(
  file: File,
  onProgress?: (label: string) => void,
): Promise<MediaItem> {
  if (!file.size) {
    throw new Error(
      `${file.name} is 0 bytes (still downloading from iCloud?). Wait until the file is fully local, then try again.`,
    );
  }

  const kind = kindFromFile(file);
  if (!kind) {
    throw new Error(
      `Unsupported type: ${file.type || "unknown"} (${file.name}). Use .mp4, .mov, .wav, .mp3, .m4a`,
    );
  }
  const mime = mimeFromFile(file);
  const useClientUpload = isHosted() || file.size > 3.5 * 1024 * 1024;

  if (useClientUpload) {
    const id = randomId();
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : kind === "video"
        ? ".mp4"
        : ".wav";
    const pathname = `ca/media/${id}/file${ext.toLowerCase()}`;

    onProgress?.(`Uploading ${file.name}…`);

    try {
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/media/blob-upload",
        multipart: true,
        contentType: mime,
        onUploadProgress: (p) => {
          onProgress?.(
            `Uploading ${file.name}… ${Math.round(p.percentage)}%`,
          );
        },
      });

      onProgress?.(`Saving ${file.name} to library…`);

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
          filename: `file${ext.toLowerCase()}`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Register failed (${res.status})`);
      }
      return body as MediaItem;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg.replace(/^Vercel Blob:\s*/i, "Upload: "));
    }
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

  if (list.length === 0) {
    return {
      done,
      errors: [
        "No files found in that drop. Drag from Finder (file icon), not Photos/Music. Or use Import video / Import audio.",
      ],
    };
  }

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    const prefix = list.length > 1 ? `(${i + 1}/${list.length}) ` : "";
    try {
      opts?.onProgress?.(`${prefix}Importing ${file.name}…`);
      const item = await importOneMediaFile(file, (label) =>
        opts?.onProgress?.(`${prefix}${label}`),
      );
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
