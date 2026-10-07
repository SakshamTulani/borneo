import { Link } from '@tanstack/react-router';
import { StarIcon } from 'lucide-react';
import { formatDay } from '@/shared/lib/format';
import { imageSource } from '@/shared/lib/image';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { Rating } from '@/shared/ui/commerce/Rating';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useMyReviewsQuery } from '../hooks/useMyReviewsQuery';
import { ReviewForm } from './ReviewForm';

const iso = (ms: number) => new Date(ms).toISOString();

/** Review prompts after delivery, inside the account only (D-151), and reviews written (D-221). */
export function ReviewsPage() {
  const query = useMyReviewsQuery();
  if (query.isError && !query.data)
    return <ErrorState title="Couldn't load your reviews" onRetry={() => void query.refetch()} />;
  if (!query.data) return <Skeleton className="h-60 w-full" aria-label="Loading your reviews" />;
  const { prompts, reviews } = query.data;
  if (prompts.length === 0 && reviews.length === 0)
    return (
      <EmptyState
        icon={<StarIcon className="size-9" strokeWidth={1.5} />}
        title="Nothing to review yet"
        body="Once something you ordered is delivered, you can tell other shoppers what you think of it here."
      />
    );
  return (
    <div className="space-y-8">
      {prompts.length ? (
        <section aria-labelledby="to-review" className="space-y-3">
          <h3 id="to-review" className="font-semibold">
            Waiting for your review ({prompts.length})
          </h3>
          <ul className="space-y-3">
            {prompts.map((p) => (
              <li key={p.orderItemId} className="rounded-xl border border-line bg-surface p-5">
                <div className="mb-4 flex items-center gap-4">
                  {p.image ? (
                    <img
                      {...imageSource(p.image.src, { aspect: 1, widths: [96, 192] })}
                      sizes="64px"
                      alt=""
                      className="size-16 shrink-0 rounded-lg bg-muted object-cover"
                    />
                  ) : null}
                  <div>
                    <Link
                      to="/products/$slug"
                      params={{ slug: p.slug }}
                      className="font-semibold hover:underline"
                    >
                      {p.productName}
                    </Link>
                    <p className="text-sm text-ink-muted">
                      Delivered {formatDay(iso(p.deliveredAt))} · verified purchase
                    </p>
                  </div>
                </div>
                <ReviewForm orderItemId={p.orderItemId} productName={p.productName} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {reviews.length ? (
        <section aria-labelledby="written" className="space-y-3">
          <h3 id="written" className="font-semibold">
            Your reviews
          </h3>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="space-y-1.5 rounded-xl border border-line bg-surface p-5">
                <Link
                  to="/products/$slug"
                  params={{ slug: r.slug }}
                  className="font-semibold hover:underline"
                >
                  {r.productName}
                </Link>
                <Rating value={r.rating} count={1} />
                {r.title ? <p className="font-semibold">{r.title}</p> : null}
                {r.body ? <p className="text-[15px]">{r.body}</p> : null}
                <p className="text-sm text-ink-muted">
                  Shown as {r.authorName} · {formatDay(iso(r.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
