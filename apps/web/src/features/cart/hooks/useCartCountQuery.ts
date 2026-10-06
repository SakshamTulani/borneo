import { useQuery } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { cartQuery } from '../repository/cartRepository';

/** Units in the cart, for the header and bottom nav. Unknown (undefined) until loaded. */
export function useCartCountQuery() {
  const session = useSessionQuery();
  const options = cartQuery(!!session.data, null);
  return useQuery({
    ...options,
    enabled: !session.isPending && options.enabled !== false,
    select: (cart) => cart.count,
  });
}
