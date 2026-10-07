import { useQuery } from '@tanstack/react-query';
import { wishlistSlugsQuery } from '../repository/wishlistRepository';

/** Only fetched when signed in. */
export function useWishlistSlugsQuery(enabled: boolean) {
  return useQuery({ ...wishlistSlugsQuery, enabled });
}
