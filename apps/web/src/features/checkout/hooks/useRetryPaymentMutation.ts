import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQuery, retryPayment } from '../repository/checkoutRepository';

/** Another try within the same hold (D-204). */
export function useRetryPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retryPayment,
    onSuccess: (order) => queryClient.setQueryData(orderQuery(order.id).queryKey, order),
  });
}
