import { useMutation } from '@tanstack/react-query';
import { requestPasswordReset } from '../repository/authRepository';

export function useRequestResetMutation() {
  return useMutation({ mutationFn: requestPasswordReset });
}
