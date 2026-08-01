type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && <p className="ca-eyebrow">{eyebrow}</p>}
        <h1
          className={`font-display font-semibold text-white ${
            eyebrow ? "mt-2" : ""
          } text-3xl sm:text-4xl`}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ca-muted">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
