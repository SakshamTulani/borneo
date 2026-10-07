import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { deleteWishlist, getWishlist, getWishlistSlugs, putWishlist } from '../api/wishlistApi';

/** Which products are saved, for every heart on the page (D-235). Under `['me']`. */
export const wishlistSlugsQuery = queryOptions({
  queryKey: ['me', 'wishlist', 'slugs'],
  queryFn: async () => (await getWishlistSlugs()).slugs,
  staleTime: 60_000,
});

/** The saved products, newest first, 24 at a time (D-229, D-235). */
export const wishlistQuery = infiniteQueryOptions({
  queryKey: ['me', 'wishlist', 'list'],
  queryFn: ({ pageParam }) => getWishlist(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});

export const saveToWishlist = async (slug: string) => (await putWishlist(slug)).slugs;
export const removeFromWishlist = async (slug: string) => (await deleteWishlist(slug)).slugs;
