import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signUpInputSchema } from '@borneo/shared';

/** Name, email, mobile and password (D-91); the same schema the API applies. */
export function useSignUpForm() {
  return useForm({
    resolver: zodResolver(signUpInputSchema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  });
}
