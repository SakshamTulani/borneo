import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mockPayment, orderQuery } from '../repository/checkoutRepository';

/** Demo: success, failure or a success that arrives after the hold (D-213). */
export function useMockPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mockPayment,
    onSuccess: (order) => {
      queryClient.setQueryData(orderQuery(order.id).queryKey, order);
      void queryClient.invalidateQueries({ queryKey: ['me', 'cart'] });
      void queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });
}
