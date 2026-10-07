import { createFileRoute } from '@tanstack/react-router';
import { myReviewsQuery, ReviewsPage } from '../features/reviews';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/reviews')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchInfiniteQuery(myReviewsQuery),
  head: () => pageHead({ title: 'Reviews', noindex: true }),
  component: () => (
    <section aria-labelledby="reviews-heading" className="space-y-5">
      <h2 id="reviews-heading" className="font-heading text-tagline font-semibold">
        Reviews
      </h2>
      <ReviewsPage />
    </section>
  ),
});
