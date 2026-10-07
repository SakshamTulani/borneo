import { useMutation, useQueryClient } from '@tanstack/react-query';
import { myReviewsQuery, writeReview } from '../repository/reviewsRepository';

/** Saves the review; the product page and the account counts change too. */
export function useWriteReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: writeReview,
    onSuccess: async (mine) => {
      queryClient.setQueryData(myReviewsQuery.queryKey, { pages: [mine], pageParams: [undefined] });
      await queryClient.invalidateQueries({ queryKey: ['me', 'summary'] });
      await queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}
