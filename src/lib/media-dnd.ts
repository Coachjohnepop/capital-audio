/** Shared drag payload so Media Library → Timeline drops work. */

export const CA_MEDIA_MIME = "application/x-capital-audio-media";

export type CaMediaDragPayload = {
  mediaId: string;
  kind: "video" | "audio";
  title: string;
};

export function setMediaDragData(
  dt: DataTransfer,
  payload: CaMediaDragPayload,
) {
  dt.effectAllowed = "copy";
  dt.setData(CA_MEDIA_MIME, JSON.stringify(payload));
  // Fallback for environments that only expose text
  dt.setData("text/plain", `ca-media:${payload.mediaId}`);
}

export function getMediaDragPayload(
  dt: DataTransfer,
): CaMediaDragPayload | null {
  const raw = dt.getData(CA_MEDIA_MIME);
  if (raw) {
    try {
      return JSON.parse(raw) as CaMediaDragPayload;
    } catch {
      /* fall through */
    }
  }
  const text = dt.getData("text/plain");
  if (text.startsWith("ca-media:")) {
    return {
      mediaId: text.slice("ca-media:".length),
      kind: "video",
      title: "",
    };
  }
  return null;
}

export function isMediaDrag(dt: DataTransfer): boolean {
  return (
    Array.from(dt.types).includes(CA_MEDIA_MIME) ||
    Array.from(dt.types).includes("text/plain")
  );
}
