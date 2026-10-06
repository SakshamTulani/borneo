import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReviewPage } from '@borneo/shared';
import { reviewsQuery } from '../repository/productRepository';

export function useProductReviewsQuery(slug: string, first: ReviewPage) {
  return useInfiniteQuery(reviewsQuery(slug, first));
}
