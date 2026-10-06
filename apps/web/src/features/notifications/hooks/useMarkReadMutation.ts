import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inboxQuery, markRead } from '../repository/notificationsRepository';

export function useMarkReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSettled: () => queryClient.invalidateQueries({ queryKey: inboxQuery.queryKey }),
  });
}
