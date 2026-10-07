import { track } from '@/features/analytics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  removeFromWishlist,
  saveToWishlist,
  wishlistQuery,
  wishlistSlugsQuery,
} from '../repository/wishlistRepository';

/** Saves or removes; every heart updates from the answer, the list refetches. */
export function useToggleWishlistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, save }: { slug: string; save: boolean }) =>
      save ? saveToWishlist(slug) : removeFromWishlist(slug),
    onSuccess: async (slugs, { slug, save }) => {
      if (save) track('wishlist_add', { slug });
      queryClient.setQueryData(wishlistSlugsQuery.queryKey, slugs);
      await queryClient.invalidateQueries({ queryKey: wishlistQuery.queryKey });
    },
  });
}
