import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressesQuery, removeAddress } from '../repository/addressesRepository';

export function useDeleteAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeAddress,
    onSettled: () => queryClient.invalidateQueries({ queryKey: addressesQuery.queryKey }),
  });
}
