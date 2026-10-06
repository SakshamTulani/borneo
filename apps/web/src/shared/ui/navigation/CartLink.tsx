import { Link } from '@tanstack/react-router';
import { ShoppingBagIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/** "3 items in your cart" for screen readers; the badge shows the number. */
export const cartLabel = (count: number | undefined) =>
  count ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart';

export function CartCountBadge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      aria-hidden
      className={cn(
        'absolute -top-1 -right-2 min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] leading-5 font-semibold text-brand-ink tabular-nums',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Header cart link (desktop). The count arrives as a prop. */
export function CartLink({ count }: { count?: number | undefined }) {
  return (
    <Link
      to="/cart"
      aria-label={cartLabel(count)}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-[15px] text-ink outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className="relative">
        <ShoppingBagIcon className="size-5" aria-hidden />
        <CartCountBadge {...(count !== undefined ? { count } : {})} />
      </span>
      Cart
    </Link>
  );
}
