import { useInfiniteQuery } from '@tanstack/react-query';
import { wishlistQuery } from '../repository/wishlistRepository';

export function useWishlistQuery() {
  return useInfiniteQuery(wishlistQuery);
}
