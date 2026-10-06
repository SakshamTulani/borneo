import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { setLineQty, storeCart } from '../repository/cartRepository';
import type { AtPincode } from '../model';

export function useUpdateCartLineMutation() {
  const queryClient = useQueryClient();
  const signedIn = !!useSessionQuery().data;
  return useMutation({
    mutationFn: ({ key, qty, pincode }: { key: string; qty: number } & AtPincode) =>
      setLineQty(signedIn, key, qty, pincode),
    onSuccess: (result, { pincode }) => storeCart(queryClient, signedIn, pincode, result),
  });
}
