/** Types and pure helpers shared by server media store and client components. */

export type MediaKind = "video" | "audio";

export interface MediaMarker {
  id: string;
  /** timestamp in seconds (section start when `end` is set) */
  t: number;
  /** section end in seconds; absent = point marker */
  end?: number;
  label: string;
  note?: string;
  by: "admin" | "client";
  /** display name for client marks */
  author?: string;
}

/** How the pixels should be displayed. 360 cameras export equirectangular video. */
export type Projection = "flat" | "360";

export interface MediaEdit {
  /** trim in-point, seconds */
  trimIn: number;
  /** trim out-point, seconds; null = end of file */
  trimOut: number | null;
  markers: MediaMarker[];
}

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  filename: string;
  mime: string;
  /** bytes */
  size: number;
  uploadedAt: string;
  /** seconds, reported by the player after first load */
  duration: number | null;
  /** defaults to flat; set to 360 for equirectangular footage */
  projection?: Projection;
  edit: MediaEdit;
  /**
   * Direct playable URL when stored in cloud (Vercel Blob CDN).
   * Prefer this for &lt;video&gt;/&lt;audio&gt;. Local dev uses /api/admin/media/:id/file.
   */
  url?: string;
}

/** Best URL for a &lt;video&gt; / &lt;audio&gt; element. */
export function mediaPlayUrl(item: Pick<MediaItem, "id" | "url">): string {
  return item.url || `/api/admin/media/${item.id}/file`;
}

export function kindFromMime(mime: string): MediaKind | null {
  if (!mime) return null;
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

/** Infer kind when the browser leaves type empty (common for some .mov/.wav). */
export function kindFromFile(file: { name: string; type: string }): MediaKind | null {
  const fromMime = kindFromMime(file.type);
  if (fromMime) return fromMime;
  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  if (
    [".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi", ".mpeg", ".mpg"].includes(
      ext,
    )
  ) {
    return "video";
  }
  if (
    [".mp3", ".wav", ".aac", ".m4a", ".flac", ".ogg", ".aif", ".aiff", ".wma"].includes(
      ext,
    )
  ) {
    return "audio";
  }
  return null;
}

export function mimeFromFile(file: { name: string; type: string }): string {
  if (file.type) return file.type;
  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
  };
  return map[ext] ?? "application/octet-stream";
}

export function formatBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${Math.ceil(n / 1e3)} KB`;
}
