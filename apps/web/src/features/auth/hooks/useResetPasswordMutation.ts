import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CUSTOMER_DATA_KEY, resetPassword, sessionQuery } from '../repository/authRepository';

/** A reset signs out every device (D-97), this browser included. */
export function useResetPasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: CUSTOMER_DATA_KEY });
      queryClient.setQueryData(sessionQuery.queryKey, null);
    },
  });
}
