/**
 * Product capability mode.
 *
 * - `audio` — multi-track audio capture, review, and timeline edits only
 * - `audio-video` — audio always on, plus multi-cam video, 360, multi-angle sync
 *
 * There is no video-only mode: video work always includes audio.
 */

export type CapabilityMode = "audio" | "audio-video";

export const CAPABILITY_STORAGE_KEY = "ca-capability-mode";
export const DEFAULT_CAPABILITY_MODE: CapabilityMode = "audio-video";

export function isCapabilityMode(value: unknown): value is CapabilityMode {
  return value === "audio" || value === "audio-video";
}

export function parseCapabilityMode(value: unknown): CapabilityMode {
  return isCapabilityMode(value) ? value : DEFAULT_CAPABILITY_MODE;
}

/** Video capture / editing tools are available. */
export function videoEnabled(mode: CapabilityMode): boolean {
  return mode === "audio-video";
}

/** Human labels for UI. */
export const capabilityLabels: Record<
  CapabilityMode,
  { short: string; title: string; description: string }
> = {
  audio: {
    short: "Audio only",
    title: "Audio only",
    description:
      "Multi-track board feeds, room mics, review links, and audio timelines. No video tools.",
  },
  "audio-video": {
    short: "Audio + Video",
    title: "Audio + Video",
    description:
      "Everything in audio, plus multi-cam video, 360° review, multi-angle sync, and picture edits. Audio is always included.",
  },
};
