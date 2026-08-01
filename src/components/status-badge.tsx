const tones = {
  neutral: "bg-white/8 text-ca-muted border-white/10",
  info: "bg-sky-500/12 text-sky-300 border-sky-400/25",
  success: "bg-emerald-500/12 text-emerald-300 border-emerald-400/25",
  warning: "bg-amber-500/12 text-amber-300 border-amber-400/25",
  accent: "bg-ca-gold/12 text-ca-gold border-ca-gold/30",
} as const;

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
