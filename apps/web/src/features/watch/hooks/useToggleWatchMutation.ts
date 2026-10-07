import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startWatching, stopWatching, watchQuery } from '../repository/watchRepository';

/** Starts or stops watching a variant; the list comes back with the answer. */
export function useToggleWatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, watch }: { sku: string; watch: boolean }) =>
      watch ? startWatching(sku) : stopWatching(sku),
    onSuccess: async (list) => {
      queryClient.setQueryData(watchQuery.queryKey, list);
      await queryClient.invalidateQueries({ queryKey: ['me', 'summary'] });
    },
  });
}
