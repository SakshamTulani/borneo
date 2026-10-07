import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelOrder, orderDetailQuery } from '../repository/ordersRepository';

/** Updates the order in place and refreshes the rest of the account (list, summary, inbox). */
export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: async (order) => {
      queryClient.setQueryData(orderDetailQuery(order.id).queryKey, order);
      await queryClient.invalidateQueries({
        queryKey: ['me'],
        predicate: (q) => q.queryKey[2] !== order.id,
      });
    },
  });
}
