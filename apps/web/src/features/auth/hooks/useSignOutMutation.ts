import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CUSTOMER_DATA_KEY, sessionQuery, signOut } from '../repository/authRepository';

export function useSignOutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: CUSTOMER_DATA_KEY });
      queryClient.setQueryData(sessionQuery.queryKey, null);
    },
  });
}
