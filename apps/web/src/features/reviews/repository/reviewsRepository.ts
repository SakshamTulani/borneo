import { infiniteQueryOptions } from '@tanstack/react-query';
import { getMyReviews, postReview } from '../api/reviewsApi';

/**
 * Prompts and the customer's reviews (D-151, D-221). Under `['me']`. Prompts come with the first
 * page; written reviews page ten at a time.
 */
export const myReviewsQuery = infiniteQueryOptions({
  queryKey: ['me', 'reviews'],
  queryFn: ({ pageParam }) => getMyReviews(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});

export const writeReview = postReview;
