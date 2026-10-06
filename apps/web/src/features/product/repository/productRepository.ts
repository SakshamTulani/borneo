import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ReviewPage } from '@borneo/shared';
import { getReviews } from '../api/getReviews';
import { getProduct } from '../api/getProduct';

/** Product page data; null for an unknown product. */
export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ['product', slug], queryFn: () => getProduct(slug), staleTime: 30_000 });

/**
 * Verified reviews (D-150). The first page arrives with the product (server-rendered); later
 * pages load on "Show more reviews".
 */
export const reviewsQuery = (slug: string, first: ReviewPage) =>
  infiniteQueryOptions({
    queryKey: ['product', slug, 'reviews'],
    queryFn: ({ pageParam }) => (pageParam ? getReviews(slug, pageParam) : Promise.resolve(first)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: { pages: [first], pageParams: [null] },
    staleTime: 5 * 60_000,
  });
