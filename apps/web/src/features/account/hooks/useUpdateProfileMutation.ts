import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionQuery } from '@/features/auth';
import { updateProfile } from '../repository/accountRepository';

/** The header and account show the new name at once. */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (customer) => queryClient.setQueryData(sessionQuery.queryKey, customer),
  });
}
