import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inboxQuery, markAllRead } from '../repository/notificationsRepository';

export function useMarkAllReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSettled: () => queryClient.invalidateQueries({ queryKey: inboxQuery.queryKey }),
  });
}
