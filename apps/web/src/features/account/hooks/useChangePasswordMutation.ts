import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changePassword } from '../repository/accountRepository';

/** Other devices are signed out (D-223); the inbox gets a note. */
export function useChangePasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}
