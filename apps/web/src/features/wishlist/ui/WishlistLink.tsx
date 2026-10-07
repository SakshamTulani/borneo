import { Link } from '@tanstack/react-router';
import { HeartIcon } from 'lucide-react';
import { useSessionQuery } from '@/features/auth';
import { useWishlistSlugsQuery } from '../hooks/useWishlistSlugsQuery';

/** Header link to the wishlist, with how many are saved (signed in only). */
export function WishlistLink() {
  const { data: customer } = useSessionQuery();
  const count = useWishlistSlugsQuery(Boolean(customer)).data?.length ?? 0;
  if (!customer) return null;
  return (
    <Link
      to="/account/wishlist"
      className="relative inline-flex size-11 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
      aria-label={`Wishlist${count ? `, ${count} saved` : ''}`}
    >
      <HeartIcon className="size-5" aria-hidden />
      {count ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-brand px-1 text-center text-xs font-semibold text-brand-ink tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
