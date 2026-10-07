import { useInfiniteQuery } from '@tanstack/react-query';
import { myReviewsQuery } from '../repository/reviewsRepository';

export function useMyReviewsQuery() {
  return useInfiniteQuery(myReviewsQuery);
}
