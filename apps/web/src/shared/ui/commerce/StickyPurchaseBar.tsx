import type { ReactNode } from 'react';
import { formatInr, type Paise } from '@borneo/shared';

type Props = {
  name: string;
  /** The selling price headline (D-30). */
  sellingPaise: Paise;
  /** The purchase action (add to cart, or the in-cart stepper). */
  action: ReactNode;
  /** `static` renders in place (design-system specimen); pages use the fixed bar. */
  placement?: 'fixed' | 'static';
};

/**
 * Mobile purchase bar on product pages (D-160): sits above the bottom nav, hidden from 1024px
 * where the buy box stays in view.
 */
export function StickyPurchaseBar({ name, sellingPaise, action, placement = 'fixed' }: Props) {
  return (
    <div
      data-slot="sticky-purchase-bar"
      className={
        placement === 'fixed'
          ? 'fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-line/70 bg-surface/90 backdrop-blur-xl lg:hidden'
          : 'rounded-xl border border-line bg-surface'
      }
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink-muted">{name}</p>
          <p className="font-semibold tabular-nums">
            <span className="sr-only">Price </span>
            {formatInr(sellingPaise)}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}
