import Link from "next/link";

type Props = {
  href?: string;
  /** Small label under/beside the mark */
  subtitle?: string;
  /** Show full wordmark */
  wordmark?: string;
  size?: "sm" | "md";
  className?: string;
};

export function BrandMark({
  href = "/",
  subtitle,
  wordmark = "Capital Audio",
  size = "md",
  className = "",
}: Props) {
  const mark =
    size === "sm"
      ? "h-8 w-8 text-[11px]"
      : "h-9 w-9 text-sm";

  const content = (
    <span className={`group flex items-center gap-2.5 ${className}`}>
      <span
        className={`flex shrink-0 items-center justify-center rounded-full border border-ca-gold/40 bg-ca-gold/10 ${mark}`}
      >
        <span className="font-display font-bold text-ca-gold">CA</span>
      </span>
      {(wordmark || subtitle) && (
        <span className="min-w-0 leading-tight">
          {wordmark && (
            <span className="block font-display text-base font-semibold tracking-tight text-white transition-colors group-hover:text-ca-gold sm:text-lg">
              {wordmark}
            </span>
          )}
          {subtitle && (
            <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-ca-muted">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="shrink-0">
      {content}
    </Link>
  );
}
