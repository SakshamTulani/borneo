import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signUpInputSchema } from '@borneo/shared';

/** Email and password for the account made inside checkout (D-92); name and phone come from the address. */
export const checkoutAccountSchema = signUpInputSchema.pick({ email: true, password: true });

export function useCheckoutAccountForm() {
  return useForm({
    resolver: zodResolver(checkoutAccountSchema),
    defaultValues: { email: '', password: '' },
  });
}
