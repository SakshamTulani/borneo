import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { applyCoupon, storeCart } from '../repository/cartRepository';
import type { AtPincode } from '../model';

export function useApplyCouponMutation() {
  const queryClient = useQueryClient();
  const signedIn = !!useSessionQuery().data;
  return useMutation({
    mutationFn: ({ code, pincode }: { code: string } & AtPincode) =>
      applyCoupon(signedIn, code, pincode),
    onSuccess: (result, { pincode }) => storeCart(queryClient, signedIn, pincode, result),
  });
}
