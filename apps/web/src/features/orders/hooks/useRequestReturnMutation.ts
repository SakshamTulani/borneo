import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestReturn } from '../repository/ordersRepository';

/** Sends the request, then refreshes the order, the returns list and the inbox. */
export function useRequestReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestReturn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}
