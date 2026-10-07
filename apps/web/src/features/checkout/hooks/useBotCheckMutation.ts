import { useMutation } from '@tanstack/react-query';
import { botCheck } from '../repository/checkoutRepository';

/** The mock bot check before a flash checkout (D-232). */
export function useBotCheckMutation() {
  return useMutation({ mutationFn: botCheck });
}
