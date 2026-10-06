import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { addToCart, storeCart } from '../repository/cartRepository';
import type { AtPincode } from '../model';

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const signedIn = !!useSessionQuery().data;
  return useMutation({
    mutationFn: ({ key, qty = 1, pincode }: { key: string; qty?: number } & AtPincode) =>
      addToCart(signedIn, { key, qty }, pincode),
    onSuccess: (result, { pincode }) => storeCart(queryClient, signedIn, pincode, result.cart),
  });
}
