import { cn } from '@/shared/lib/utils';

/** Draft mark from docs/brand/borneo-logo.svg: a "b" whose bowl is a leaf. */
export function Logo({
  withWordmark = true,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" className="size-8" role="img" aria-label="Borneo">
        <rect width="64" height="64" rx="14" className="fill-brand" />
        <rect x="17" y="11" width="7" height="42" rx="3.5" className="fill-brand-ink" />
        <path d="M20.5 53 C20.5 38 30 29 47 27 C48 44 38 53 20.5 53 Z" className="fill-brand-ink" />
        <path
          d="M24 50 Q35 42 43.5 31"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="stroke-brand"
        />
      </svg>
      {withWordmark ? (
        <span className="font-heading text-xl font-bold tracking-tight text-ink" aria-hidden>
          borneo
        </span>
      ) : null}
    </span>
  );
}
