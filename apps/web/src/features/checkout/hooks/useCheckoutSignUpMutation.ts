import { useMutation } from '@tanstack/react-query';
import type { AddressFields } from '@borneo/shared';
import { useSaveAddressMutation } from '@/features/addresses';
import { useSignUpMutation } from '@/features/auth';

/**
 * Creates the account inside checkout (D-92): name and phone from the address, which becomes the
 * default. The cart in this browser joins the account on the next cart read (D-192).
 */
export function useCheckoutSignUpMutation() {
  const signUp = useSignUpMutation();
  const save = useSaveAddressMutation();
  return useMutation({
    mutationFn: async (input: {
      account: { email: string; password: string };
      address: AddressFields;
    }) => {
      await signUp.mutateAsync({
        name: input.address.name,
        phone: input.address.phone,
        ...input.account,
      });
      await save.mutateAsync({ input: { ...input.address, isDefault: true } });
    },
  });
}
