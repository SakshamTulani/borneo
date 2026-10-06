import { StarIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type Props = { value?: number; count: number; className?: string };

const stars = (filled: boolean) =>
  Array.from({ length: 5 }, (_, i) => (
    <StarIcon key={i} className={cn('size-4 shrink-0', filled && 'fill-current')} aria-hidden />
  ));

/** Verified-purchase rating (D-150). Zero reviews shows "No reviews yet", never a fake score. */
export function Rating({ value, count, className }: Props) {
  if (count === 0 || value === undefined) {
    return <p className={cn('text-sm text-ink-muted', className)}>No reviews yet</p>;
  }
  const width = `${(Math.min(5, Math.max(0, value)) / 5) * 100}%`;
  return (
    <p className={cn('flex items-center gap-2 text-sm', className)}>
      <span
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5`}
        className="relative inline-flex"
      >
        <span className="flex text-line-strong">{stars(false)}</span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-warning"
          style={{ width }}
        >
          {stars(true)}
        </span>
      </span>
      <span className="font-semibold tabular-nums" aria-hidden>
        {value.toFixed(1)}
      </span>
      <span className="text-ink-muted">
        {count} verified review{count === 1 ? '' : 's'}
      </span>
    </p>
  );
}
