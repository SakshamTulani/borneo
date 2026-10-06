import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressesQuery, makeDefault } from '../repository/addressesRepository';

export function useSetDefaultAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: makeDefault,
    onSettled: () => queryClient.invalidateQueries({ queryKey: addressesQuery.queryKey }),
  });
}
