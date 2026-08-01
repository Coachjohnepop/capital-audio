"use client";

import { capabilityLabels, type CapabilityMode } from "@/lib/capability";
import { useCapability } from "@/components/capability-provider";
import { IconAudio, IconVideo } from "@/components/icons";

const modes: CapabilityMode[] = ["audio", "audio-video"];

export function CapabilityToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode, videoOn } = useCapability();

  if (compact) {
    return (
      <div
        role="group"
        aria-label="Studio mode"
        className="inline-flex items-center rounded-full border border-white/12 bg-ca-elevated/80 p-0.5 shadow-inner"
      >
        {modes.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                active
                  ? "bg-ca-gold text-ca-ink shadow-sm"
                  : "text-ca-muted hover:text-white"
              }`}
            >
              {m === "audio" ? "Audio" : "A + V"}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="ca-card overflow-hidden">
      <div className="border-b border-white/6 bg-ca-elevated/40 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ca-eyebrow">Capability</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-white">
              Studio mode
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ca-muted">
              Choose what this session exposes. Video tools always sit on top of
              audio — there is no video-only mode.
            </p>
          </div>
          <span className={videoOn ? "ca-pill ca-pill-gold" : "ca-pill"}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                videoOn ? "bg-ca-gold" : "bg-zinc-400"
              }`}
            />
            {videoOn ? "Video on" : "Audio only"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {modes.map((m) => {
          const meta = capabilityLabels[m];
          const active = mode === m;
          const Icon = m === "audio" ? IconAudio : IconVideo;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-2xl border p-5 text-left transition-all ${
                active
                  ? "border-ca-gold/45 bg-ca-gold/10 ring-1 ring-ca-gold/25"
                  : "border-white/8 bg-ca-ink/50 hover:border-white/16"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex rounded-xl p-2.5 ring-1 ${
                    active
                      ? "bg-ca-gold/15 text-ca-gold ring-ca-gold/30"
                      : "bg-white/5 text-ca-muted ring-white/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {active && (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-ca-gold">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-4 font-medium text-white">{meta.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ca-muted">
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
