import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { cartQuery } from '../repository/cartRepository';

/** The cart, priced now, with delivery at `pincode` (D-55). Waits until we know who is shopping. */
export function useCartQuery(pincode: string | null = null) {
  const session = useSessionQuery();
  const options = cartQuery(!!session.data, pincode);
  return useQuery({
    ...options,
    enabled: !session.isPending && options.enabled !== false,
    // A new pincode keeps showing the cart while delivery is rechecked.
    placeholderData: keepPreviousData,
  });
}
