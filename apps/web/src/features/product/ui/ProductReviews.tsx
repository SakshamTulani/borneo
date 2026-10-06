import { BadgeCheckIcon, StarIcon } from 'lucide-react';
import { formatDay } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/base/button';
import { Rating } from '@/shared/ui/commerce/Rating';
import { useProductReviewsQuery } from '../hooks/useProductReviewsQuery';
import type { ProductDetail } from '../model';

const Stars = ({ value }: { value: number }) => (
  <span role="img" aria-label={`Rated ${value} out of 5`} className="flex text-warning">
    {Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={cn('size-4', i < value ? 'fill-current' : 'text-line-strong')}
        aria-hidden
      />
    ))}
  </span>
);

/**
 * Verified reviews only (D-150): the rating, how many at each star, then the newest reviews with
 * the reviewer's first name and initial. "No reviews yet" until the first one.
 */
export function ProductReviews({ product }: { product: ProductDetail }) {
  const { rating, reviews, slug } = product;
  const query = useProductReviewsQuery(slug, reviews.page);
  const items = query.data.pages.flatMap((p) => p.items);
  const most = Math.max(1, ...reviews.counts);

  return (
    <section aria-labelledby="pdp-reviews" className="space-y-6">
      <h2 id="pdp-reviews" className="font-heading text-headline tracking-tight">
        Reviews
      </h2>
      {rating.count === 0 ? (
        <p className="text-sm text-ink-muted">
          No reviews yet. Only customers who bought this product can review it.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
          <div className="space-y-4">
            <Rating
              {...(rating.average !== null ? { value: rating.average } : {})}
              count={rating.count}
            />
            <ul className="space-y-1.5" aria-label="Reviews by rating">
              {[5, 4, 3, 2, 1].map((star) => {
                const n = reviews.counts[star - 1]!;
                return (
                  <li key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-12 tabular-nums">{star} star</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span
                        className="block h-full rounded-full bg-warning"
                        style={{ width: `${(n / most) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-ink-muted tabular-nums">
                      <span className="sr-only">{star} star reviews: </span>
                      {n}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-ink-muted">
              Only customers who bought this product can review it.
            </p>
          </div>
          <div className="space-y-4">
            <ul className="divide-y divide-line rounded-xl bg-surface px-5">
              {items.map((r) => (
                <li key={r.id} className="space-y-2 py-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={r.rating} />
                    {r.title ? <h3 className="font-semibold">{r.title}</h3> : null}
                  </div>
                  {r.body ? <p className="text-ink-muted">{r.body}</p> : null}
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                    <span className="text-ink">{r.author}</span>
                    <span className="inline-flex items-center gap-1 text-success">
                      <BadgeCheckIcon className="size-4" aria-hidden />
                      Verified purchase
                    </span>
                    <span>{formatDay(new Date(r.createdAt).toISOString())}</span>
                  </p>
                </li>
              ))}
            </ul>
            {query.hasNextPage ? (
              <Button
                variant="outline"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Show more reviews
              </Button>
            ) : null}
            {query.isFetchNextPageError ? (
              <p role="alert" className="text-sm text-danger">
                Couldn't load more reviews. Please try again.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
