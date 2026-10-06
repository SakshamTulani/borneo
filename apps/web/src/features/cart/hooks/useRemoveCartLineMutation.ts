import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { removeLine, storeCart } from '../repository/cartRepository';
import type { AtPincode } from '../model';

export function useRemoveCartLineMutation() {
  const queryClient = useQueryClient();
  const signedIn = !!useSessionQuery().data;
  return useMutation({
    mutationFn: ({ key, pincode }: { key: string } & AtPincode) =>
      removeLine(signedIn, key, pincode),
    onSuccess: (result, { pincode }) => storeCart(queryClient, signedIn, pincode, result),
  });
}
