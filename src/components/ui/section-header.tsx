import Link from "next/link";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="ca-eyebrow">{eyebrow}</p>}
        <h2
          className={`font-display text-3xl font-semibold text-white sm:text-4xl ${
            eyebrow ? "mt-2" : ""
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-xl text-ca-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="text-sm font-medium text-ca-gold transition-colors hover:text-ca-gold-light"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
