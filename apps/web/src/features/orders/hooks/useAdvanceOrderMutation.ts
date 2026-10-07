import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advanceOrder, orderDetailQuery } from '../repository/ordersRepository';

/** Updates the order in place and refreshes the rest of the account (list, summary, inbox). */
export function useAdvanceOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: advanceOrder,
    onSuccess: async (order) => {
      queryClient.setQueryData(orderDetailQuery(order.id).queryKey, order);
      await queryClient.invalidateQueries({
        queryKey: ['me'],
        predicate: (q) => q.queryKey[2] !== order.id,
      });
    },
  });
}
