import { formatInr, type Paise } from '@borneo/shared';
import { cn } from '@/shared/lib/utils';

export type PriceBlockProps = {
  sellingPaise: Paise;
  /** Genuine MRP only, and only when above the selling price (D-31). */
  mrpPaise?: Paise;
  /** From the pricing rule. This component never calculates savings. */
  savings?: { paise: Paise; percent: number };
  /** Only when the offer applies to everyone paying that way (D-32). Never the headline (D-30). */
  effective?: { paise: Paise; offerName: string };
  emiFromPaise?: Paise;
  /** `sm` is the compact card form: price, MRP, savings % and EMI on two lines. */
  size?: 'sm' | 'md' | 'lg';
  unavailable?: boolean;
  className?: string;
};

export function PriceBlock(props: PriceBlockProps) {
  const {
    sellingPaise,
    mrpPaise,
    savings,
    effective,
    emiFromPaise,
    size = 'md',
    unavailable,
    className,
  } = props;
  if (unavailable) {
    return <p className={cn('text-sm text-ink-muted', className)}>Currently unavailable</p>;
  }
  if (size === 'sm') {
    return (
      <div className={cn('space-y-0.5', className)}>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-semibold tabular-nums">
            <span className="sr-only">Price </span>
            {formatInr(sellingPaise)}
          </span>
          {mrpPaise ? (
            <span className="text-sm text-ink-muted">
              <span className="sr-only">MRP </span>
              <del className="tabular-nums">{formatInr(mrpPaise)}</del>
            </span>
          ) : null}
          {savings ? (
            <span className="text-sm font-semibold text-offer">{savings.percent}% off</span>
          ) : null}
        </p>
        {emiFromPaise ? (
          <p className="text-sm text-ink-muted">
            EMI from <span className="tabular-nums">{formatInr(emiFromPaise)}</span>/mo
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            'font-heading font-semibold tracking-tight tabular-nums',
            size === 'lg' ? 'text-headline' : 'text-tagline',
          )}
        >
          <span className="sr-only">Price </span>
          {formatInr(sellingPaise)}
        </span>
        {mrpPaise ? (
          <span className="text-sm text-ink-muted">
            MRP <del className="tabular-nums">{formatInr(mrpPaise)}</del>
          </span>
        ) : null}
        {savings ? (
          <span className="text-sm font-semibold text-offer">
            Save {formatInr(savings.paise)} ({savings.percent}%)
          </span>
        ) : null}
      </p>
      <p className="text-xs text-ink-muted">Inclusive of all taxes</p>
      {effective ? (
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{formatInr(effective.paise)}</span> effective
          with {effective.offerName}
        </p>
      ) : null}
      {emiFromPaise ? (
        <p className="text-sm text-ink-muted">
          or from <span className="tabular-nums">{formatInr(emiFromPaise)}</span>/mo with EMI
        </p>
      ) : null}
    </div>
  );
}
