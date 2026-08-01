import type { CapabilityMode } from "@/lib/capability";

const labels: Record<CapabilityMode, string> = {
  audio: "Audio only",
  "audio-video": "Audio + Video",
};

/** Small pill for package / project mode. */
export function ModeBadge({
  mode,
  emphasize = false,
}: {
  mode: CapabilityMode;
  emphasize?: boolean;
}) {
  return (
    <span className={emphasize ? "ca-pill ca-pill-gold" : "ca-pill"}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          mode === "audio-video" ? "bg-ca-gold" : "bg-zinc-400"
        }`}
        aria-hidden
      />
      {labels[mode]}
    </span>
  );
}
