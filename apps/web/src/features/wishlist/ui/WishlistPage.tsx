import { Link } from '@tanstack/react-router';
import { HeartIcon } from 'lucide-react';
import { toCatalogCard } from '@/features/catalog';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useWishlistQuery } from '../hooks/useWishlistQuery';
import { WishlistButton } from './WishlistButton';

/** Saved products, newest first, priced and stocked as now (D-235). */
export function WishlistPage() {
  const query = useWishlistQuery();
  if (query.isError && !query.data)
    return <ErrorState title="Couldn't load your wishlist" onRetry={() => void query.refetch()} />;
  if (!query.data) return <Skeleton className="h-60 w-full" aria-label="Loading your wishlist" />;
  const items = query.data.pages.flatMap((p) => p.items);
  const total = query.data.pages[0]?.total ?? 0;
  if (items.length === 0)
    return (
      <EmptyState
        icon={<HeartIcon className="size-9" strokeWidth={1.5} />}
        title="Your wishlist is empty"
        body="Tap the heart on any product to save it here for later."
        action={
          <Link to="/categories" className={buttonVariants()}>
            Browse categories
          </Link>
        }
      />
    );
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {total} saved {total === 1 ? 'product' : 'products'}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {items.map(({ product }) => {
          const { id: _id, slug, ...card } = toCatalogCard(product);
          void _id;
          return (
            <li key={product.id} className="flex">
              <ProductCard
                {...card}
                link={{ to: '/products/$slug', params: { slug } }}
                action={<WishlistButton slug={slug} name={product.name} compact />}
                className="w-full"
              />
            </li>
          );
        })}
      </ul>
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more ({total - items.length})
        </Button>
      ) : null}
    </div>
  );
}
