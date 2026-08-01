/**
 * Browser-side media import — shared by Import buttons and drag-and-drop.
 * Always uses direct Blob upload on hosted deploys (avoids 413).
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

/** Collect files from a drop / file input (handles empty FileList edge cases). */
export function filesFromDataTransfer(dt: DataTransfer): File[] {
  if (dt.files && dt.files.length > 0) {
    return Array.from(dt.files);
  }
  const out: File[] = [];
  if (dt.items) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f && f.size > 0) out.push(f);
      }
    }
  }
  return out;
}

/** Upload one file into the media library. */
export async function importOneMediaFile(
  file: File,
  onProgress?: (label: string) => void,
): Promise<MediaItem> {
  const kind = kindFromFile(file);
  if (!kind) {
    throw new Error(
      `Unsupported type: ${file.type || "unknown"} (${file.name}). Try .mp4, .mov, .wav, .mp3, .m4a`,
    );
  }
  const mime = mimeFromFile(file);

  // Hosted (Vercel): always direct-to-Blob. Local: FormData for small, Blob if CA_CLOUD.
  const useClientUpload = isHosted() || file.size > 3.5 * 1024 * 1024;

  if (useClientUpload) {
    const id = randomId();
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : kind === "video"
        ? ".mp4"
        : ".wav";
    // Extension in path helps Blob infer type when browser mime is empty
    const pathname = `ca/media/${id}/file${ext.toLowerCase()}`;

    onProgress?.(`Uploading ${file.name}…`);

    try {
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/media/blob-upload",
        // Always multipart for media masters — more reliable for large files
        multipart: true,
        contentType: mime,
        onUploadProgress: (p) => {
          const pct = Math.round(p.percentage);
          onProgress?.(`Uploading ${file.name}… ${pct}%`);
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
      // Surface Blob errors clearly
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
  const list = Array.from(files).filter((f) => f && f.size > 0);
  const done: MediaItem[] = [];
  const errors: string[] = [];

  if (list.length === 0) {
    errors.push("No files found in that drop (empty or unsupported).");
    return { done, errors };
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
