import { MinusIcon, PlusIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type Props = {
  value: number;
  /** From the cart rules: the line limit or what can be supplied (D-193). */
  max: number;
  min?: number;
  /** What is being counted, for screen readers ("Echo Buds 2"). */
  label: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

const step =
  'inline-flex size-11 items-center justify-center rounded-full text-ink outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40';

/** − n + with 44px targets. Display only: the limits arrive as props. */
export function QuantityStepper({
  value,
  max,
  min = 1,
  label,
  onChange,
  disabled,
  className,
}: Props) {
  return (
    <div
      role="group"
      aria-label={`Quantity of ${label}`}
      className={cn('inline-flex items-center rounded-full border border-line-strong', className)}
    >
      <button
        type="button"
        className={step}
        aria-label={`One fewer ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon className="size-4" aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-8 text-center tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={step}
        aria-label={`One more ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
