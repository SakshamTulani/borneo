import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { removeCoupon, storeCart } from '../repository/cartRepository';
import type { AtPincode } from '../model';

export function useRemoveCouponMutation() {
  const queryClient = useQueryClient();
  const signedIn = !!useSessionQuery().data;
  return useMutation({
    mutationFn: ({ pincode }: AtPincode) => removeCoupon(signedIn, pincode),
    onSuccess: (result, { pincode }) => storeCart(queryClient, signedIn, pincode, result),
  });
}
