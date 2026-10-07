import { useQuery } from '@tanstack/react-query';
import { myReviewsQuery } from '../repository/reviewsRepository';

export function useMyReviewsQuery() {
  return useQuery(myReviewsQuery);
}
