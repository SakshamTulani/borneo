import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advanceReturn } from '../repository/ordersRepository';

/** Demo support desk (D-219); the order, list and inbox all change. */
export function useAdvanceReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: advanceReturn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}
