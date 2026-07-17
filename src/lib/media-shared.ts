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
}

export function kindFromMime(mime: string): MediaKind | null {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

export function formatBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${Math.ceil(n / 1e3)} KB`;
}
