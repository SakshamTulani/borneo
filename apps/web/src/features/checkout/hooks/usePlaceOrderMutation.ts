import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQuery, placeOrder } from '../repository/checkoutRepository';

/** Places the order; the cart changes once it is confirmed (D-207). */
export function usePlaceOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(orderQuery(order.id).queryKey, order);
      void queryClient.invalidateQueries({ queryKey: ['me', 'cart'] });
    },
  });
}
