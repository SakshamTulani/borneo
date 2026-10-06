import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressesQuery, saveAddress } from '../repository/addressesRepository';

export function useSaveAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesQuery.queryKey }),
  });
}
