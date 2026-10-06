import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CUSTOMER_DATA_KEY, sessionQuery, signIn } from '../repository/authRepository';

export function useSignInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signIn,
    onSuccess: (customer) => {
      queryClient.removeQueries({ queryKey: CUSTOMER_DATA_KEY });
      queryClient.setQueryData(sessionQuery.queryKey, customer);
    },
  });
}
