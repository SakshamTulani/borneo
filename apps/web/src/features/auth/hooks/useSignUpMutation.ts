import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CUSTOMER_DATA_KEY, sessionQuery, signUp } from '../repository/authRepository';

/** Creates the account and signs in (D-91). */
export function useSignUpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signUp,
    onSuccess: (customer) => {
      queryClient.removeQueries({ queryKey: CUSTOMER_DATA_KEY });
      queryClient.setQueryData(sessionQuery.queryKey, customer);
    },
  });
}
